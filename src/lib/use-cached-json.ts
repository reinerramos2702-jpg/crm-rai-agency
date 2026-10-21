'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchJson, getCached, isFresh, setCached, subscribe } from './swr-cache';

interface Options {
  /** Mientras el dato sea más reciente que esto no se vuelve a pedir al montar. */
  ttlMs?: number;
}

/**
 * Datos JSON con caché compartida: muestra al instante lo último conocido y
 * lo actualiza por detrás. `loading` solo es true cuando todavía no hay nada que mostrar.
 */
export function useCachedJson<T>(url: string, { ttlMs = 15_000 }: Options = {}) {
  // El estado inicial sale de la caché en memoria: vacía en el servidor y en la primera carga (sin desajuste de hidratación).
  const [data, setData] = useState<T | undefined>(() => getCached<T>(url)?.data);
  const [error, setError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);

  const refresh = useCallback(async () => {
    setRevalidating(true);
    try {
      setError(null);
      await fetchJson<T>(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setRevalidating(false);
    }
  }, [url]);

  useEffect(() => {
    const cached = getCached<T>(url);
    if (cached) setData(cached.data);
    const off = subscribe(url, () => {
      const c = getCached<T>(url);
      if (c) setData(c.data);
    });
    if (!isFresh(url, ttlMs)) void refresh();
    return off;
  }, [url, ttlMs, refresh]);

  /** Actualiza la caché (y la pantalla) sin ir a la red; útil para cambios optimistas. */
  const mutate = useCallback((next: T) => setCached(url, next), [url]);

  return { data, error, loading: data === undefined && error === null, revalidating, refresh, mutate };
}
