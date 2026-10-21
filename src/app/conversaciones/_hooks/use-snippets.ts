'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { sendJson } from '../_lib/conv-http';
import { parseSnippetResult, parseSnippets } from '../_lib/conv-parse';
import { useTimedJson } from './use-timed-json';

/** Fragmentos (respuestas rápidas) del workspace. */
export function useSnippets() {
  const query = useTimedJson('/api/snippets', { parse: parseSnippets });
  const { patch } = query;

  const create = useCallback(
    async (title: string, body: string): Promise<boolean> => {
      const res = await sendJson('/api/snippets', 'POST', { title: title.trim(), body: body.trim() });
      const snippet = res.ok ? parseSnippetResult(res.data) : null;
      if (!snippet) {
        toast.error(res.ok ? 'Respuesta inesperada al guardar el fragmento.' : res.message);
        return false;
      }
      patch((previous) => [snippet, ...previous]);
      toast.success('Fragmento guardado');
      return true;
    },
    [patch],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await sendJson(`/api/snippets?id=${encodeURIComponent(id)}`, 'DELETE');
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      patch((previous) => previous.filter((s) => s.id !== id));
    },
    [patch],
  );

  return { snippets: query.data ?? [], hasData: query.data !== undefined, loading: query.loading, error: query.error, refresh: query.refresh, create, remove };
}
