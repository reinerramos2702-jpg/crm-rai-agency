import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import { isPublicPath } from '@/lib/public-paths';
import { safeNext } from '@/lib/safe-next';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * Guardia de páginas privadas (edge): sin cookie de sesión válida se redirige a
 * /login desde el servidor, así el CRM nunca se dibuja para luego rebotar.
 * Solo verifica la firma y la expiración del JWT (sin base de datos): la
 * autorización real sigue en cada API (`requireRole`). No toca /api/*, /_next,
 * archivos estáticos ni las páginas públicas (`public-paths.ts`).
 */
const encoder = new TextEncoder();

async function hasValidSession(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return false; // sin secreto = sin sesión verificable: a /login, sin error
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), { algorithms: ['HS256'] });
    return Boolean(payload.sub && payload.email); // mismos requisitos que verifyJwt en auth.ts
  } catch {
    return false; // firma inválida o token vencido
  }
}

/** Igual que `isDevBypassActive` (auth.ts): nunca en producción. Duplicado a propósito: auth.ts importa prisma. */
function devBypassActive(): boolean {
  return process.env.DEV_BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production';
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Las públicas nunca redirigen (tampoco con cookie inválida): evita bucles en /login.
  if (isPublicPath(pathname) || devBypassActive()) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await hasValidSession(token))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  const next = safeNext(`${pathname}${search}`);
  if (next !== '/') url.searchParams.set('next', next);

  const res = NextResponse.redirect(url); // 307
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export const config = {
  // Fuera: /api, /_next y cualquier ruta con extensión (favicon.ico, robots.txt, imágenes de /public…).
  matcher: ['/((?!api(?:/|$)|_next(?:/|$)|.*\\..*).*)'],
};
