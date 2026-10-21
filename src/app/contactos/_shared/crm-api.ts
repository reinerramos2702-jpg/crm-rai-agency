import { invalidate } from '@/lib/swr-cache';

/** El cuerpo llega como `unknown`: cada llamador lo valida con una guarda de tipo. */
export type ApiResult = { ok: true; data: unknown } | { ok: false; error: string; status: number };

function messageFrom(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const err = data.error;
    if (typeof err === 'string' && err.trim()) return err;
  }
  return fallback;
}

/** Petición JSON con errores ya legibles: nunca lanza, devuelve `{ ok: false, error }`. */
export async function sendJson(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: unknown = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
      const fallback = res.status === 403
        ? 'Tu rol no permite esta acción.'
        : 'No se pudo completar la acción. Inténtalo de nuevo.';
      return { ok: false, error: messageFrom(data, fallback), status: res.status };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.', status: 0 };
  }
}

/** Endpoint de la lista de contactos (único origen de datos del módulo). */
export const CONTACTS_URL = '/api/contacts';

/** Descarta de la caché compartida la lista de contactos (tras crear, editar o borrar). */
export function invalidateContacts(): void {
  invalidate(CONTACTS_URL);
}

/** Ejecuta `worker` sobre cada elemento con un máximo de `limit` llamadas simultáneas (no lanza). */
export async function runLimited<T, R>(items: readonly T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let cursor = 0;
  async function lane(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => lane()));
  return results;
}
