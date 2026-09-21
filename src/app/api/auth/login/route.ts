import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { signJwt, SESSION_COOKIE } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 días

/**
 * POST /api/auth/login — login email+password (Etapa 3, Prioridad 0).
 * - Verifica el hash scrypt del User.
 * - Emite JWT vía jose (signJwt, mismo payload que verifyJwt espera).
 * - La sesión viaja SOLO en cookie httpOnly (nunca localStorage); el frontend
 *   la envía sola en requests same-origin y getAuth la lee de la cookie.
 * - Rate-limit básico en memoria por email y por IP (5 intentos / 15 min).
 * - Respuesta genérica 401 para usuario inexistente, sin password o password
 *   incorrecto: no filtra qué parte falló.
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const rlEmail = checkRateLimit(`login:${normalizedEmail}`);
  const rlIp = checkRateLimit(`login:ip:${ip}`);
  if (!rlEmail.ok || !rlIp.ok) {
    const retryAfter = Math.max(rlEmail.retryAfterSec ?? 0, rlIp.retryAfterSec ?? 0);
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Respuesta única para "no existe", "sin password seteado" y "password malo".
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = await signJwt({
    userId: user.id,
    email: user.email,
    displayName: user.displayName ?? undefined,
  });

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}