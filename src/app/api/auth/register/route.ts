import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { isPlatformSuperAdmin } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { normalizePhone } from '@/lib/phone';
import { invalidateRoleContext } from '@/lib/role-context-cache';

export const runtime = 'nodejs';

const DEFAULT_BUSINESS_NAME = 'Mi negocio';
const MAX_BUSINESS_NAME = 120;

/**
 * POST /api/auth/register — registro ABIERTO con workspace propio
 * (decisión de producto de Reiner, spec v4 §3 + 11 oct 2026: modelo freemium).
 *
 * Reglas:
 *  1. Rate-limit por email e IP (mismo helper y límites que el login) ANTES de
 *     cualquier lógica: al ser público necesita la misma defensa que /login.
 *  2. Honeypot `website`: si llega con contenido → 400 genérico, sin crear nada.
 *  3. `acceptTerms: true` obligatorio (también por invitación). No se persiste
 *     (deuda documentada: requiere migración aprobada).
 *  4. Con invitación pendiente (WorkspaceMember.status='invited') → se activan
 *     TODAS las invitaciones del email (flujo histórico, sin workspace nuevo).
 *  5. Sin invitación y sin ser super admin → se crea un Workspace propio
 *     (`businessName` recortado, máx. 120, por defecto «Mi negocio»); el owner
 *     resuelve rol admin por `ownerId` (src/lib/roles.ts), sin fila de membership.
 *  6. Super admin (SUPER_ADMIN_EMAILS) sin invitación → bootstrap, sin workspace nuevo.
 *  7. Si el User ya existe con passwordHash → 409.
 *  8. Si el User existe SIN passwordHash (SSO/dev) y NO hay invitación ni es
 *     super admin → 409: en registro abierto, cualquiera podría fijar la clave
 *     de una cuenta ajena creada por SSO (toma de cuenta). Solo se permite con
 *     invitación o bootstrap.
 */
export async function POST(req: NextRequest) {
  const { email, password, displayName, businessName, acceptTerms, website, phone } = await req
    .json()
    .catch(() => ({}));

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 8 caracteres' },
      { status: 400 }
    );
  }

  // Teléfono opcional (para recuperar la cuenta por SMS): formato internacional.
  const rawPhone = typeof phone === 'string' ? phone.trim() : '';
  const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !normalizedPhone) {
    return NextResponse.json(
      { error: 'Teléfono no válido. Usa formato internacional, ej. +58 412 1234567.' },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  // 1. Rate-limit (mismo patrón que login/route.ts).
  const rlEmail = checkRateLimit(`register:${normalizedEmail}`);
  const rlIp = checkRateLimit(`register:ip:${ip}`);
  if (!rlEmail.ok || !rlIp.ok) {
    const retryAfter = Math.max(rlEmail.retryAfterSec ?? 0, rlIp.retryAfterSec ?? 0);
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  // 2. Honeypot (después del rate-limit; mensaje genérico, sin revelar el motivo).
  if (typeof website === 'string' && website.trim() !== '') {
    return NextResponse.json({ error: 'No se pudo completar el registro.' }, { status: 400 });
  }

  // 3. Aceptación legal.
  if (acceptTerms !== true) {
    return NextResponse.json(
      { error: 'Debes aceptar los Términos y la Política de privacidad.' },
      { status: 400 }
    );
  }

  // 4. ¿Invitación pendiente o bootstrap de super admin? Si no, es registro abierto.
  const pending = await prisma.workspaceMember.findMany({
    where: { email: normalizedEmail, status: 'invited' },
  });
  const isSuperAdmin = isPlatformSuperAdmin(normalizedEmail);
  const openSignup = pending.length === 0 && !isSuperAdmin;

  // 5. Cuenta ya creada con password, o cuenta SSO sin password en registro abierto.
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing?.passwordHash || (existing && openSignup)) {
    return NextResponse.json(
      { error: 'Ya existe una cuenta con este email. Inicia sesión.' },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  // 6. Crear el User (o actualizar el existente sin password cuando hay invitación/bootstrap).
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          displayName: displayName || existing.displayName,
          ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        },
      })
    : await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          displayName: displayName || null,
          passwordHash,
          ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        },
      });

  // 7. Activar todas las invitaciones pendientes de este email.
  if (pending.length > 0) {
    await prisma.workspaceMember.updateMany({
      where: { email: normalizedEmail, status: 'invited' },
      data: { status: 'active', userId: user.id },
    });
    // Su membresía acaba de activarse: que el próximo request la vea sin esperar al TTL.
    invalidateRoleContext(user.id);
  }

  // 8. Registro abierto: workspace propio (el owner resuelve rol admin por ownerId).
  let workspaceId: string | undefined;
  if (openSignup) {
    const name =
      (typeof businessName === 'string' ? businessName.trim().slice(0, MAX_BUSINESS_NAME) : '') ||
      DEFAULT_BUSINESS_NAME;
    const ws = await prisma.workspace.create({ data: { ownerId: user.id, name } });
    workspaceId = ws.id;
  }

  return NextResponse.json({ ok: true, email: user.email, workspaceId });
}
