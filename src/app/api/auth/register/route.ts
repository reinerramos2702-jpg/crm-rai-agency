import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { isPlatformSuperAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/auth/register — registro SOLO por invitación (decisión de producto
 * cerrada en panel-control.html, Prioridad 0).
 *
 * Reglas:
 *  1. Debe existir una invitación pendiente (WorkspaceMember.status='invited'
 *     con el email) creada por un admin vía POST /api/team. Sin invitación →
 *     403. Única excepción: el email está en SUPER_ADMIN_EMAILS (bootstrap de
 *     la plataforma, gated por env var — no es registro público).
 *  2. Si el User ya existe con passwordHash → 409 (cuenta ya creada).
 *  3. Si el User existe sin passwordHash (creado por SSO/dev) → se actualiza
 *     con el hash y se activan sus membresías pendientes.
 *  4. Al aceptar, todas las invitaciones pendientes de ese email pasan a
 *     'active' con userId vinculado.
 */
export async function POST(req: NextRequest) {
  const { email, password, displayName } = await req.json().catch(() => ({}));

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 8 caracteres' },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Invitación pendiente (o bootstrap de super admin).
  const pending = await prisma.workspaceMember.findMany({
    where: { email: normalizedEmail, status: 'invited' },
  });
  if (pending.length === 0 && !isPlatformSuperAdmin(normalizedEmail)) {
    return NextResponse.json(
      { error: 'No tienes una invitación pendiente. El registro es solo por invitación.' },
      { status: 403 }
    );
  }

  // 2. Cuenta ya creada con password.
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: 'Ya existe una cuenta con este email. Inicia sesión.' },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  // 3. Crear el User (o actualizar el existente sin password, p.ej. creado por SSO).
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, displayName: displayName || existing.displayName },
      })
    : await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          displayName: displayName || null,
          passwordHash,
        },
      });

  // 4. Activar todas las invitaciones pendientes de este email.
  if (pending.length > 0) {
    await prisma.workspaceMember.updateMany({
      where: { email: normalizedEmail, status: 'invited' },
      data: { status: 'active', userId: user.id },
    });
  }

  return NextResponse.json({ ok: true, email: user.email });
}