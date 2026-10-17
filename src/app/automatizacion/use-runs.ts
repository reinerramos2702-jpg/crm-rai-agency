'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJson, getCached, isFresh, subscribe } from '@/lib/swr-cache';
import { mergeRuns } from '@/lib/automation-runs';
import { isRunsPayload } from './guards';
import type { RunT, RunsPayload } from './types';

const TTL_MS = 15_000;

interface MoreState {
  url: string;
  runs: RunT[];
  cursor: string | null;
}

/**
 * Primera página de ejecuciones para una URL (con filtros) usando la caché compartida,
 * más las páginas siguientes. Al cambiar de filtros se sigue mostrando lo anterior (atenuado) hasta que llega lo nuevo.
 */
export function useRuns(url: string, buildMoreUrl: (cursor: string) => string) {
  const [, rerender] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [more, setMore] = useState<MoreState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastData = useRef<RunsPayload | undefined>(undefined);

  const cached = getCached<RunsPayload>(url)?.data;
  if (cached) lastData.current = cached;
  const data = cached ?? lastData.current;

  const refresh = useCallback(async () => {
    setRevalidating(true);
    setError(null);
    try {
      await fetchJson<RunsPayload>(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setRevalidating(false);
    }
  }, [url]);

  useEffect(() => {
    const off = subscribe(url, () => rerender((n) => n + 1));
    if (!isFresh(url, TTL_MS)) void refresh();
    return off;
  }, [url, refresh]);

  const extra = more && more.url === url ? more : null;
  const runs = mergeRuns(data?.runs ?? [], extra?.runs ?? []);
  const nextCursor = extra ? extra.cursor : data?.nextCursor ?? null;

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildMoreUrl(nextCursor));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body: unknown = await res.json();
      if (!isRunsPayload(body)) throw new Error('Respuesta inesperada');
      const page = body;
      setMore((prev) => ({ url, runs: mergeRuns(prev && prev.url === url ? prev.runs : [], page.runs), cursor: page.nextCursor }));
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, buildMoreUrl, url]);

  return {
    runs,
    summary: data?.summary,
    nextCursor,
    loading: data === undefined && error === null,
    /** Hay datos de otra consulta en pantalla mientras llegan los nuevos. */
    stale: cached === undefined && data !== undefined,
    error,
    revalidating,
    refresh,
    loadMore,
    loadingMore,
  };
}
