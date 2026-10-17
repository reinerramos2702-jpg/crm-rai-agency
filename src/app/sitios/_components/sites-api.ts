import { invalidate } from '@/lib/swr-cache';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

function messageFrom(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err;
  }
  return fallback;
}

/** Petición JSON con errores ya legibles: nunca lanza, devuelve `{ ok: false, error }`. */
export async function sendJson<T>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<ApiResult<T>> {
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
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.', status: 0 };
  }
}

/** Descarta de la caché compartida la lista y los detalles de sitios (tras crear, editar o borrar). */
export function invalidateSites(): void {
  invalidate('/api/sites');
}
