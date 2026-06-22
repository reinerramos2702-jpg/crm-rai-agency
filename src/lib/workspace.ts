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
  const cacheable = { id: ws.id, name: ws.name, ownerId: ws.ownerId };
  workspaceCache.set(userId, cacheable);
  return ws;
}

/** Invalida cache si se renombra/borra workspace manualmente. */
export function invalidateWorkspaceCache(userId?: string) {
  if (userId) workspaceCache.delete(userId);
  else workspaceCache.clear();
}
