import { prisma } from './db';

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
