import type { ActiveWorkspace } from './workspace';
import type { Role } from './roles-shared';

/**
 * Caché de VIDA MUY CORTA del contexto de autorización (workspace activo + rol).
 *
 * Qué ahorra: `getRoleContext` hacía 1–2 consultas a la base remota en CADA
 * petición de API (workspace por cabecera + membresía). Una pantalla abre 4–8
 * APIs a la vez, así que el coste se multiplicaba.
 *
 * Garantías de seguridad (no negociables):
 *  - La identidad SIEMPRE se verifica antes (JWT, expiración, firma): esta caché
 *    solo guarda lo que sale de la base (workspace + rol), nunca decide quién es
 *    el usuario. La clave se forma con el userId/email YA verificados, así que no
 *    guarda ni deriva nada del token en claro.
 *  - TTL absoluto de 5 s (no deslizante): un cambio de rol/membresía hecho en
 *    cualquier proceso surte efecto como máximo 5 s después. En el mismo proceso
 *    es inmediato gracias a `invalidateRoleContext`.
 *  - NUNCA se cachean resultados negativos: ni «no autenticado» (ni siquiera
 *    llega aquí), ni «sin acceso al workspace» (null), ni el rol mínimo
 *    `viewer` (el que se asigna por defecto a quien no tiene membresía).
 *  - Una invalidación que ocurre mientras hay una consulta en vuelo descarta
 *    su resultado (contador de época): no se puede «re-cachear» un dato viejo.
 */
export const ROLE_CONTEXT_TTL_MS = 5_000;
const MAX_ENTRIES = 500;
const SEP = '\u0000';

export interface CachedRoleContext {
  workspace: ActiveWorkspace;
  role: Role;
}

interface Entry extends CachedRoleContext {
  expiresAt: number;
}

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<CachedRoleContext | null>>();
let epoch = 0;

/** Interruptor de emergencia: ROLE_CONTEXT_CACHE=off desactiva la caché y la consulta compartida. */
export function isRoleContextCacheEnabled(): boolean {
  return process.env.ROLE_CONTEXT_CACHE !== 'off';
}

/** Clave a partir de datos ya verificados: userId + email + workspace pedido (cabecera, o vacío). */
export function roleContextKey(userId: string, email: string, requestedWorkspaceId: string | null | undefined): string {
  return [userId, email.trim().toLowerCase(), requestedWorkspaceId ?? ''].join(SEP);
}

export function getCachedRoleContext(key: string, now = Date.now()): CachedRoleContext | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= now) {
    store.delete(key);
    return undefined;
  }
  return { workspace: hit.workspace, role: hit.role };
}

/** Guarda solo resultados positivos: el rol mínimo `viewer` no se cachea nunca. */
export function setCachedRoleContext(key: string, value: CachedRoleContext, now = Date.now()): boolean {
  if (value.role === 'viewer') return false;
  if (store.size >= MAX_ENTRIES) {
    // Barrido barato: primero lo caducado; si sigue lleno, la entrada más antigua.
    for (const [k, e] of store) if (e.expiresAt <= now) store.delete(k);
    if (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
  }
  store.set(key, { ...value, expiresAt: now + ROLE_CONTEXT_TTL_MS });
  return true;
}

/**
 * Resuelve con caché y comparte la consulta entre peticiones simultáneas del
 * mismo usuario/workspace (una pantalla lanza varias APIs a la vez).
 * `loader` devuelve null cuando no hay acceso: eso no se guarda.
 */
export async function loadRoleContext(
  key: string,
  loader: () => Promise<CachedRoleContext | null>,
): Promise<CachedRoleContext | null> {
  const hit = getCachedRoleContext(key);
  if (hit) return hit;

  const running = inflight.get(key);
  if (running) return running;

  const startedAt = epoch;
  const p = loader()
    .then((value) => {
      if (value && startedAt === epoch) setCachedRoleContext(key, value);
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/**
 * Invalida el contexto de un usuario (todas sus claves) o, sin argumento, de todos.
 * Llamar SIEMPRE que cambie su membresía, rol, estado o el workspace.
 */
export function invalidateRoleContext(userId?: string): void {
  epoch += 1; // descarta lo que esté en vuelo
  if (!userId) {
    store.clear();
    inflight.clear();
    return;
  }
  const prefix = userId + SEP;
  for (const k of Array.from(store.keys())) if (k.startsWith(prefix)) store.delete(k);
  for (const k of Array.from(inflight.keys())) if (k.startsWith(prefix)) inflight.delete(k);
}

/** Solo para pruebas. */
export function resetRoleContextCache(): void {
  store.clear();
  inflight.clear();
  epoch = 0;
}
