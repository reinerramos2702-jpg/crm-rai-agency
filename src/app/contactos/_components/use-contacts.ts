'use client';

import { useCallback, useMemo } from 'react';
import { useCachedJson } from '@/lib/use-cached-json';
import { CONTACTS_URL, runLimited, sendJson } from '../_shared/crm-api';
import { parseContacts, withTag, type Contact } from './contact-model';
import type { NewContact } from './import-model';

export interface BulkResult {
  done: number;
  failed: number;
}

/** Id del contacto recién creado en la respuesta de `POST /api/contacts`. */
function createdId(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('contact' in data)) return null;
  const contact = data.contact;
  if (typeof contact !== 'object' || contact === null || !('id' in contact)) return null;
  return typeof contact.id === 'string' ? contact.id : null;
}

function tally(results: readonly boolean[]): BulkResult {
  const done = results.filter(Boolean).length;
  return { done, failed: results.length - done };
}

/** Lista de contactos del espacio (caché compartida) y sus operaciones contra `/api/contacts`. */
export function useContacts() {
  const list = useCachedJson<unknown>(CONTACTS_URL, { ttlMs: 15_000 });
  const { refresh } = list;
  const contacts = useMemo(() => parseContacts(list.data), [list.data]);

  /** Crea un contacto (y, si se pide, le pone una etiqueta). Devuelve `null` si salió bien o el mensaje de error. */
  const create = useCallback(async (input: NewContact, source: string, tag?: string): Promise<string | null> => {
    const res = await sendJson(CONTACTS_URL, 'POST', {
      name: input.name,
      source,
      ...(input.email ? { email: input.email } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
    });
    if (!res.ok) return res.error;
    const id = createdId(res.data);
    if (tag && id) await sendJson(`${CONTACTS_URL}/${encodeURIComponent(id)}`, 'PATCH', { tags: withTag([], tag) });
    await refresh();
    return null;
  }, [refresh]);

  const createMany = useCallback(async (items: readonly NewContact[], source: string): Promise<BulkResult> => {
    const results = await runLimited(items, 3, async (item) => (await create(item, source)) === null);
    return tally(results);
  }, [create]);

  const remove = useCallback(async (ids: readonly string[]): Promise<BulkResult> => {
    const results = await runLimited(ids, 4, async (id) => (await sendJson(`${CONTACTS_URL}/${encodeURIComponent(id)}`, 'DELETE')).ok);
    await refresh();
    return tally(results);
  }, [refresh]);

  const addTag = useCallback(async (targets: readonly Contact[], tag: string): Promise<BulkResult> => {
    const results = await runLimited(targets, 4, async (c) => {
      const tags = withTag(c.tags, tag);
      if (tags.length === c.tags.length) return true;
      return (await sendJson(`${CONTACTS_URL}/${encodeURIComponent(c.id)}`, 'PATCH', { tags })).ok;
    });
    await refresh();
    return tally(results);
  }, [refresh]);

  return {
    contacts,
    loading: list.loading,
    error: list.error,
    revalidating: list.revalidating,
    refresh,
    create,
    createMany,
    remove,
    addTag,
  };
}
