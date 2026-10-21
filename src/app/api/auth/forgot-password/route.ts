import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { normalizePhone } from '@/lib/phone';
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from '@/lib/reset-token';
import { appBaseUrl, sendPasswordReset, type ResetChannel } from '@/lib/notify';

/**
 * POST /api/auth/forgot-password  { identifier }  (email o teléfono internacional)
 *
 * Seguridad:
 *  - Respuesta SIEMPRE genérica (200) exista o no la cuenta → no revela qué emails/teléfonos
 *    están registrados.
 *  - Rate limit por IP y por identificador.
 *  - Token de 256 bits de un solo uso; en DB solo el sha256; vigencia 30 min; un token nuevo
 *    invalida los anteriores.
 *  - Teléfono ambiguo (asociado a 2+ cuentas) → no se envía nada.
 *  - El enlace usa NEXT_PUBLIC_APP_URL, nunca la cabecera Host.
 */
const GENERIC = {
  ok: true,
  message: 'Si la cuenta existe, te enviamos instrucciones para restablecer tu contraseña.',
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : '';
  if (!identifier || identifier.length > 254) {
    return NextResponse.json({ error: 'Ingresa tu email o teléfono.' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rlIp = checkRateLimit(`forgot:ip:${ip}`, { max: 10, windowMs: 15 * 60_000 });
  const rlId = checkRateLimit(`forgot:${identifier.toLowerCase()}`, { max: 3, windowMs: 15 * 60_000 });
  if (!rlIp.ok || !rlId.ok) {
    const retry = Math.max(rlIp.retryAfterSec ?? 0, rlId.retryAfterSec ?? 0);
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(retry) } }
    );
  }

  let channel: ResetChannel;
  let to: string;
  let user: { id: string } | null = null;

  if (identifier.includes('@')) {
    channel = 'email';
    to = identifier.toLowerCase();
    user = await prisma.user.findUnique({ where: { email: to }, select: { id: true } });
  } else {
    const phone = normalizePhone(identifier);
    if (!phone) {
      return NextResponse.json(
        { error: 'Teléfono no válido. Usa formato internacional, ej. +58 412 1234567.' },
        { status: 400 }
      );
    }
    channel = 'sms';
    to = phone;
    const matches = await prisma.user.findMany({ where: { phone }, select: { id: true }, take: 2 });
    user = matches.length === 1 ? matches[0] : null;
  }

  const base = appBaseUrl();
  if (user && base) {
    const token = generateResetToken();
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        channel,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    try {
      const sent = await sendPasswordReset({
        channel,
        to,
        link: `${base}/restablecer?token=${token}`,
      });
      if (!sent.ok) console.error('[auth] forgot-password: proveedor de envío no configurado');
    } catch (e) {
      console.error('[auth] forgot-password: fallo al enviar', (e as Error).name);
    }
  }

  return NextResponse.json(GENERIC);
}
