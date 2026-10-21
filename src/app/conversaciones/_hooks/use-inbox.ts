'use client';

import { useCallback, useMemo } from 'react';
import { parseContactsPayload } from '../_lib/conv-parse';
import { summarize } from '../_lib/conv-model';
import { useTimedJson } from './use-timed-json';

/** Lista de contactos con su última conversación (columna izquierda y Analítica). */
export function useInbox() {
  const list = useTimedJson('/api/contacts', { parse: parseContactsPayload, ttlMs: 10_000 });
  const { patch } = list;
  const contacts = useMemo(() => list.data ?? [], [list.data]);
  const summary = useMemo(() => summarize(contacts), [contacts]);

  /** Pone a cero los no leídos en pantalla mientras el servidor confirma. */
  const markRead = useCallback(
    (contactId: string) =>
      patch((previous) =>
        previous.map((contact) =>
          contact.id === contactId
            ? { ...contact, conversations: contact.conversations.map((c) => ({ ...c, unreadCount: 0 })) }
            : contact,
        ),
      ),
    [patch],
  );

  return {
    contacts,
    summary,
    hasData: list.data !== undefined,
    loading: list.loading,
    error: list.error,
    revalidating: list.revalidating,
    refresh: list.refresh,
    markRead,
  };
}
