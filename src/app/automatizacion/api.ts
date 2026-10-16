import { getCached, setCached } from '@/lib/swr-cache';

const NETWORK_ERROR = 'Error de red: no se pudo contactar al servidor.';

export function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : NETWORK_ERROR;
}

/** Petición JSON con mensajes de error en español. Lanza `Error` con el texto listo para mostrar. */
export async function requestJson<T = unknown>(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(NETWORK_ERROR);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Error del servidor (${res.status})`);
  }
  return (await res.json().catch(() => ({}))) as T;
}

/** Cambia lo que hay en la caché de una URL leyendo siempre el valor más reciente (no uno capturado antes). */
export function updateCached<T>(url: string, fn: (current: T) => T): void {
  const current = getCached<T>(url)?.data;
  if (current !== undefined) setCached(url, fn(current));
}
