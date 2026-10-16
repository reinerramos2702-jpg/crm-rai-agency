'use client';

// Hook de datos del Dashboard: caché SWR en memoria compartida (swr-cache) +
// copia opcional en localStorage para pintar al instante tras recargar la página.
// Todo acceso a localStorage ocurre en efectos (nunca durante el render ni en el
// estado inicial) para no romper la hidratación.

import { useCallback, useEffect, useState } from 'react';
import { fetchJson, getCached, isFresh, setCached, subscribe } from './swr-cache';

interface Options<T> {
  /** Mientras el dato sea más reciente que esto no se vuelve a pedir al montar. */
  ttlMs?: number;
  /** Clave de localStorage donde guardar la última respuesta. */
  persistKey?: string;
  /** Edad máxima de la copia local para usarla (por defecto, sin límite). */
  maxAgeMs?: number;
  /** Extrae la marca de tiempo de la copia local; por defecto, la guardada junto al dato. */
  accept?: (data: T) => boolean;
}

interface Stored<T> { at: number; data: T }

function readStored<T>(key: string): Stored<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored<T>;
    return parsed && typeof parsed.at === 'number' && parsed.data !== undefined ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored<T>(key: string, data: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), data } satisfies Stored<T>));
  } catch {
    /* cuota llena o storage bloqueado: se ignora */
  }
}

/**
 * Como `useCachedJson`, pero `url` puede ser null (en espera) y admite copia local.
 * `loading` solo es true mientras no hay nada que mostrar.
 */
export function useDashJson<T>(url: string | null, { ttlMs = 15_000, persistKey, maxAgeMs, accept }: Options<T> = {}) {
  const [data, setData] = useState<T | undefined>(() => (url ? getCached<T>(url)?.data : undefined));
  const [error, setError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);

  const refresh = useCallback(
    async (fresh = false) => {
      if (!url) return;
      setRevalidating(true);
      try {
        setError(null);
        if (fresh) {
          const sep = url.includes('?') ? '&' : '?';
          const res = await fetch(`${url}${sep}fresh=1`, { credentials: 'same-origin', cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setCached(url, (await res.json()) as T);
        } else {
          await fetchJson<T>(url);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error de red');
      } finally {
        setRevalidating(false);
      }
    },
    [url],
  );

  useEffect(() => {
    if (!url) return;
    const cached = getCached<T>(url);
    if (!cached && persistKey) {
      const stored = readStored<T>(persistKey);
      const ageOk = stored && (maxAgeMs === undefined || Date.now() - stored.at <= maxAgeMs);
      if (stored && ageOk && (!accept || accept(stored.data))) {
        // Pinta lo último conocido; como no está en la caché en memoria, se revalida enseguida.
        setData(stored.data);
      }
    }
    if (cached) setData(cached.data);
    const off = subscribe(url, () => {
      const c = getCached<T>(url);
      if (!c) return;
      setData(c.data);
      if (persistKey) writeStored(persistKey, c.data);
    });
    if (!isFresh(url, ttlMs)) void refresh();
    return off;
  }, [url, ttlMs, persistKey, maxAgeMs, accept, refresh]);

  // Al volver a la pestaña tras un rato, se actualiza por detrás (sin spinner).
  useEffect(() => {
    if (!url) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !isFresh(url, 45_000)) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [url, refresh]);

  const mutate = useCallback(
    (next: T) => {
      if (url) setCached(url, next);
    },
    [url],
  );

  return { data, error, loading: data === undefined && error === null, revalidating, refresh, mutate };
}
