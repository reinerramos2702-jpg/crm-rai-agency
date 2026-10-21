/**
 * Rate-limit básico en memoria (ventana fija por clave).
 * Suficiente para un deploy de instancia única (Vercel serverless escala a
 * varias instancias: cada una tiene su propio contador — ver limitación en el
 * reporte de la Etapa 3). Claves típicas: `login:<email>` y `login:ip:<ip>`.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const DEFAULT_MAX = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 min

// Auto-limpieza: cuando el Map supera este tamaño, se barren las entradas
// expiradas para que la memoria no crezca sin límite en procesos largos.
const SWEEP_THRESHOLD = 1000;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec?: number;
}

export function checkRateLimit(
  key: string,
  opts?: { max?: number; windowMs?: number }
): RateLimitResult {
  const max = opts?.max ?? DEFAULT_MAX;
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();

  if (buckets.size >= SWEEP_THRESHOLD) sweepRateLimits();

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true };
}

/** Barre entradas expiradas (auto-invocado al crecer el Map). */
export function sweepRateLimits(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/** Solo para tests: vacía el estado. */
export function resetRateLimits(): void {
  buckets.clear();
}