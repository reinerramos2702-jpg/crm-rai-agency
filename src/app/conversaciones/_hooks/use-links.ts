'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { sendJson } from '../_lib/conv-http';
import { parseLinkResult, parseLinks } from '../_lib/conv-parse';
import { useTimedJson } from './use-timed-json';

/** Enlaces de activación rastreables (/go/[slug]). */
export function useLinks() {
  const query = useTimedJson('/api/activation-links', { parse: parseLinks });
  const { patch } = query;

  const create = useCallback(
    async (label: string, destination: string): Promise<boolean> => {
      const res = await sendJson('/api/activation-links', 'POST', { label: label.trim(), destination });
      const link = res.ok ? parseLinkResult(res.data) : null;
      if (!link) {
        toast.error(res.ok ? 'Respuesta inesperada al crear el enlace.' : res.message);
        return false;
      }
      patch((previous) => [link, ...previous]);
      toast.success('Enlace creado');
      return true;
    },
    [patch],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await sendJson(`/api/activation-links?id=${encodeURIComponent(id)}`, 'DELETE');
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      patch((previous) => previous.filter((l) => l.id !== id));
    },
    [patch],
  );

  return { links: query.data ?? [], hasData: query.data !== undefined, loading: query.loading, error: query.error, refresh: query.refresh, create, remove };
}
