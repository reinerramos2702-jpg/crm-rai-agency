import { jwtVerify, SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { prisma } from './db';

export interface AuthContext {
  userId: string;
  email: string;
  displayName?: string;
}

const encoder = new TextEncoder();

/** Nombre de la cookie httpOnly de sesión (Etapa 3 — Auth real). */
export const SESSION_COOKIE = 'rai_session';

export async function verifyJwt(token: string): Promise<AuthContext | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(process.env.JWT_SECRET!), {
      algorithms: ['HS256'],
    });
    if (!payload.sub || !payload.email) return null;
    return {
      userId: payload.sub as string,
      email: payload.email as string,
      displayName: payload.name as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Emite un JWT de sesión del CRM (HS256, expiración 7 días) con el mismo
 * payload que verifyJwt espera: sub=userId, email, name=displayName.
 * Usado por POST /api/auth/login (Etapa 3). El JWT viaja en cookie httpOnly,
 * nunca en localStorage.
 */
export async function signJwt(ctx: {
  userId: string;
  email: string;
  displayName?: string;
}): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado — no se puede emitir sesión.');
  return new SignJWT({ email: ctx.email, name: ctx.displayName })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(ctx.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encoder.encode(secret));
}

/**
 * Cache en memoria de usuarios sincronizados. Evita upsert a DB en cada request.
 * Clave: userId. Valor: AuthContext.
 * En dev (DEV_BYPASS_AUTH) la entrada se mantiene durante toda la vida del proceso.
 * En prod, se invalida tras AUTH_CACHE_TTL_MS para refrescar email/displayName.
 */
const AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const authCache = new Map<string, { ctx: AuthContext; expiresAt: number }>();
let devUserSynced = false;

/**
 * Super admin de la plataforma (RAI Agency, cross-tenant). Se decide SOLO por
 * la env var SUPER_ADMIN_EMAILS (emails separados por coma), nunca por
 * WorkspaceMember.role: un admin de workspace no puede crear super admins.
 * El email sale del JWT verificado (o del usuario dummy de dev).
 */
export function isPlatformSuperAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

let bypassIgnoredWarned = false;

/**
 * El bypass solo tiene efecto fuera de producción: si DEV_BYPASS_AUTH quedara
 * en 'true' por error en un deploy productivo, se ignora y se exige JWT real.
 */
export function isDevBypassActive(): boolean {
  if (process.env.DEV_BYPASS_AUTH !== 'true') return false;
  if (process.env.NODE_ENV === 'production') {
    if (!bypassIgnoredWarned) {
      console.error('[auth] DEV_BYPASS_AUTH=true ignorado: NODE_ENV=production exige JWT real.');
      bypassIgnoredWarned = true;
    }
    return false;
  }
  return true;
}

/**
 * Extrae el contexto del usuario desde JWT del CRM (SSO).
 * En dev, si DEV_BYPASS_AUTH=true, devuelve un user dummy y lo crea si hace falta.
 */
export async function getAuth(req: NextRequest): Promise<AuthContext | null> {
  if (isDevBypassActive()) {
    const ctx: AuthContext = {
      userId: 'dev-user-001',
      email: 'dev@rai.local',
      displayName: 'Dev Operator',
    };
    // Solo hacer upsert una vez por proceso (no en cada request).
    if (!devUserSynced) {
      try {
        await prisma.user.upsert({
          where: { id: 'dev-user-001' },
          update: {},
          create: {
            id: 'dev-user-001',
            email: 'dev@rai.local',
            displayName: 'Dev Operator',
          },
        });
        devUserSynced = true;
      } catch {
        // Si DB no responde, seguimos con el ctx dummy para no bloquear la UI.
      }
    }
    return ctx;
  }

  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  // Etapa 3: además del header Bearer (SSO externo), acepta la cookie httpOnly
  // de sesión emitida por POST /api/auth/login. El frontend autentica con la
  // cookie (se envía sola en requests same-origin), sin tocar localStorage.
  const token = bearerToken ?? req.cookies?.get(SESSION_COOKIE)?.value ?? null;
  if (!token) return null;

  const ctx = await verifyJwt(token);
  if (!ctx) return null;

  // Sincroniza usuario local con CRM (con cache TTL para no golpear DB cada request).
  const cached = authCache.get(ctx.userId);
  const now = Date.now();
  if (!cached || cached.expiresAt < now) {
    try {
      await prisma.user.upsert({
        where: { id: ctx.userId },
        update: { email: ctx.email, displayName: ctx.displayName },
        create: { id: ctx.userId, email: ctx.email, displayName: ctx.displayName },
      });
    } catch {
      // Tolerar fallo de DB para no bloquear el request.
    }
    authCache.set(ctx.userId, { ctx, expiresAt: now + AUTH_CACHE_TTL_MS });
  }

  return ctx;
}

export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  const ctx = await getAuth(req);
  if (!ctx) throw new Response('Unauthorized', { status: 401 });
  return ctx;
}
