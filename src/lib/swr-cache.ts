/**
 * Caché de datos del cliente (stale-while-revalidate).
 * Objetivo: que al entrar a un módulo se vea al instante lo último que se sabía
 * y se actualice por detrás, en lugar de esperar a la red con un spinner.
 */

interface Entry {
  data: unknown;
  at: number;
}

export type Fetcher = (url: string) => Promise<Response>;

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<() => void>>();

const defaultFetcher: Fetcher = (url) => fetch(url, { credentials: 'same-origin' });

export function getCached<T>(key: string): { data: T; at: number } | undefined {
  return store.get(key) as { data: T; at: number } | undefined;
}

export function isFresh(key: string, ttlMs: number, now = Date.now()): boolean {
  const hit = store.get(key);
  return !!hit && now - hit.at < ttlMs;
}

function notify(key: string) {
  listeners.get(key)?.forEach((cb) => cb());
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, at: Date.now() });
  notify(key);
}

/** Suscripción a cambios de una clave (la usa el hook para repintar). */
export function subscribe(key: string, cb: () => void): () => void {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(cb);
  return () => {
    set!.delete(cb);
  };
}

/** Descarta entradas cuyo identificador empieza por el prefijo (o todas). */
export function invalidate(prefix = ''): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** GET JSON con deduplicación: dos peticiones simultáneas comparten la misma llamada. */
export function fetchJson<T>(url: string, fetcher: Fetcher = defaultFetcher): Promise<T> {
  const running = inflight.get(url);
  if (running) return running as Promise<T>;
  const p = fetcher(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as T;
      setCached(url, data);
      return data;
    })
    .finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

/** Precarga silenciosa: no hace nada si el dato es reciente o ya se está pidiendo. */
export function prefetchJson(url: string, ttlMs = 20_000, fetcher: Fetcher = defaultFetcher): void {
  if (isFresh(url, ttlMs) || inflight.has(url)) return;
  fetchJson(url, fetcher).catch(() => {
    /* la precarga nunca debe molestar */
  });
}

/** Solo para pruebas. */
export function resetSwrCache(): void {
  store.clear();
  inflight.clear();
  listeners.clear();
}
