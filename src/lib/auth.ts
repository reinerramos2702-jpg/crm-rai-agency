import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { prisma } from './db';

export interface AuthContext {
  userId: string;
  email: string;
  displayName?: string;
}

const encoder = new TextEncoder();

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
 * Cache en memoria de usuarios sincronizados. Evita upsert a DB en cada request.
 * Clave: userId. Valor: AuthContext.
 * En dev (DEV_BYPASS_AUTH) la entrada se mantiene durante toda la vida del proceso.
 * En prod, se invalida tras AUTH_CACHE_TTL_MS para refrescar email/displayName.
 */
const AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const authCache = new Map<string, { ctx: AuthContext; expiresAt: number }>();
let devUserSynced = false;

/**
 * Extrae el contexto del usuario desde JWT del CRM (SSO).
 * En dev, si DEV_BYPASS_AUTH=true, devuelve un user dummy y lo crea si hace falta.
 */
export async function getAuth(req: NextRequest): Promise<AuthContext | null> {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
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
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
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
