import type { NextRequest } from 'next/server';
import { prisma } from './db';
import { isPlatformSuperAdmin, type AuthContext } from './auth';

/**
 * Cache en memoria de workspace por userId. El workspace por defecto no cambia,
 * así que cachearlo elimina 1 query DB por cada request del CRM.
 * Se reinicia automáticamente cuando el proceso reinicia (npm run dev hot reload).
 */
type CachedWorkspace = { id: string; name: string; ownerId: string };
const workspaceCache = new Map<string, CachedWorkspace>();

/**
 * Devuelve el workspace por defecto del usuario, creándolo si no existe.
 * Reutilizado por todos los módulos del CRM (Conversaciones, Marketing, etc.)
 * para no duplicar la lógica de "auto-crear workspace dev".
 */
export async function getOrCreateWorkspace(userId: string) {
  const cached = workspaceCache.get(userId);
  if (cached) return cached;

  let ws = await prisma.workspace.findFirst({ where: { ownerId: userId } });
  if (!ws) {
    ws = await prisma.workspace.create({
      data: { ownerId: userId, name: 'Default Workspace' },
    });
  }
  const cacheable: CachedWorkspace = { id: ws.id, name: ws.name, ownerId: ws.ownerId };
  workspaceCache.set(userId, cacheable);
  return cacheable;
}

/**
 * Igual que getOrCreateWorkspace pero devuelve el registro COMPLETO de Prisma
 * (sin servir desde cache), para rutas que necesitan campos fuera del cache —
 * p.ej. el doc de marca (`brandDocText`/`brandDocName`/`brandDocUpdatedAt`),
 * que cambia con cada subida y no debe leerse de memoria.
 */
export async function getOrCreateWorkspaceFull(userId: string) {
  const cached = workspaceCache.get(userId);
  if (cached) {
    const fresh = await prisma.workspace.findUnique({ where: { id: cached.id } });
    if (fresh) return fresh;
    workspaceCache.delete(userId);
  }
  let ws = await prisma.workspace.findFirst({ where: { ownerId: userId } });
  if (!ws) {
    ws = await prisma.workspace.create({ data: { ownerId: userId, name: 'Default Workspace' } });
  }
  workspaceCache.set(userId, { id: ws.id, name: ws.name, ownerId: ws.ownerId });
  return ws;
}

/** Invalida cache si se renombra/borra workspace manualmente. */
export function invalidateWorkspaceCache(userId?: string) {
  if (userId) workspaceCache.delete(userId);
  else workspaceCache.clear();
}

export interface ActiveWorkspace {
  id: string;
  name: string;
  ownerId: string;
}

/**
 * Error de autorización al resolver el workspace activo. `status` distingue
 * "no existe" (404) de "existe pero no tenés acceso" (403) — el caller decide
 * cuánta fidelidad de error propagar (ver getRoleContext en roles.ts).
 */
export class WorkspaceAccessError extends Error {
  constructor(public status: 403 | 404, message: string) {
    super(message);
    this.name = 'WorkspaceAccessError';
  }
}

/**
 * ÚNICA función que resuelve en qué workspace opera el request actual.
 * Consumida por getRoleContext() (roles.ts), por el claim de RLS
 * (app.current_workspace_id, ver sub-fase 0.4) y por las rutas migradas en
 * la sub-fase 0.5 — nunca debe haber una segunda ruta paralela para esto.
 *
 * Reglas:
 *  1. Sin header X-Workspace-Id -> workspace propio (getOrCreateWorkspace),
 *     retrocompatibilidad total con el comportamiento actual.
 *  2. Con header -> válido solo si el usuario es ownerId de ese workspace,
 *     tiene una fila WorkspaceMember activa ahí, o es super admin de la
 *     plataforma (SUPER_ADMIN_EMAILS). Si no, WorkspaceAccessError (403/404)
 *     — nunca un fallback silencioso a otro workspace.
 *
 * El super admin también cae en su workspace propio si no manda header: el
 * acceso cross-tenant siempre es explícito.
 *
 * Dependencia de Etapa 3: el frontend transportará workspaceId en la cookie
 * JWT. Ese cambio de transporte se implementará en auth, no en esta fase de
 * scoping; las rutas solo deben consumir el workspace ya resuelto aquí.
 */
export async function resolveActiveWorkspace(
  req: NextRequest,
  auth: AuthContext
): Promise<ActiveWorkspace> {
  const requestedId = req.headers.get('x-workspace-id');

  if (!requestedId) {
    return getOrCreateWorkspace(auth.userId);
  }

  const ws = await prisma.workspace.findUnique({ where: { id: requestedId } });
  if (!ws) throw new WorkspaceAccessError(404, 'Workspace no encontrado.');
  if (ws.ownerId === auth.userId || isPlatformSuperAdmin(auth.email)) return ws;

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId: ws.id, userId: auth.userId, status: 'active' },
  });
  if (member) return ws;

  throw new WorkspaceAccessError(403, 'No tenés acceso a este workspace.');
}
