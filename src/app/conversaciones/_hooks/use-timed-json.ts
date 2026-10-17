'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { getCached, isFresh, setCached, subscribe } from '@/lib/swr-cache';
import { describeLoadError, requestJson } from '../_lib/conv-http';

interface Options<T> {
  /** Valida el JSON recibido. Debe ser una función estable (de módulo). null = respuesta inválida. */
  parse: (raw: unknown) => T | null;
  /** Mientras el dato sea más reciente que esto no se vuelve a pedir al montar. */
  ttlMs?: number;
}

interface Patched<T> {
  raw: unknown;
  value: T;
}

const inflight = new Map<string, Promise<unknown>>();

/** Una sola petición por URL a la vez; siempre termina (plazo en `requestJson`), así nunca queda colgada. */
function load(url: string): Promise<unknown> {
  const running = inflight.get(url);
  if (running) return running;
  const request = requestJson(url)
    .then((data) => {
      setCached(url, data);
      return data;
    })
    .finally(() => inflight.delete(url));
  inflight.set(url, request);
  return request;
}

/**
 * Datos JSON con la caché compartida de `@/lib/swr-cache` (stale-while-revalidate),
 * pero con plazo, validación y error explícito:
 *  - `loading` solo es true mientras no hay NADA que mostrar y la petición sigue viva;
 *  - tras el plazo o un fallo pasa a `error` (con «Reintentar» vía `refresh`);
 *  - `patch` aplica cambios locales sin tocar la caché compartida (otros módulos usan las mismas URL).
 */
export function useTimedJson<T>(url: string | null, { parse, ttlMs = 15_000 }: Options<T>) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [failure, setFailure] = useState<{ url: string; message: string } | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [patched, setPatched] = useState<Patched<T> | null>(null);
  const seq = useRef(0);
  const current = useRef<T | undefined>(undefined);
  const latestRaw = useRef<unknown>(undefined);

  const raw: unknown = url ? getCached<unknown>(url)?.data : undefined;
  const parsed = raw === undefined ? undefined : parse(raw);
  const base = parsed === null ? undefined : parsed;
  const value = patched && patched.raw === raw ? patched.value : base;
  current.current = value;
  latestRaw.current = raw;

  const refresh = useCallback(async () => {
    if (!url) return;
    const mine = ++seq.current;
    setRevalidating(true);
    setFailure(null);
    try {
      await load(url);
    } catch (error) {
      if (mine === seq.current) setFailure({ url, message: describeLoadError(error) });
    } finally {
      if (mine === seq.current) setRevalidating(false);
    }
  }, [url]);

  useEffect(() => {
    if (!url) return undefined;
    const off = subscribe(url, bump);
    if (!getCached<unknown>(url) || !isFresh(url, ttlMs)) void refresh();
    return off;
  }, [url, ttlMs, refresh]);

  /** Cambio local (p. ej. tras guardar una nota). Se descarta cuando llegan datos nuevos del servidor. */
  const patch = useCallback(
    (update: (previous: T) => T) => {
      const previous = current.current;
      if (previous === undefined) return;
      const next = update(previous);
      current.current = next;
      setPatched({ raw: latestRaw.current, value: next });
    },
    [],
  );

  const invalid = parsed === null;
  const error = failure && failure.url === url ? failure.message : invalid ? 'La respuesta del servidor no es válida.' : null;

  return {
    data: value,
    error,
    loading: url !== null && value === undefined && error === null,
    revalidating,
    refresh,
    patch,
  };
}
