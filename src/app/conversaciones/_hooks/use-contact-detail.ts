'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { parseContactDetail } from '../_lib/conv-parse';
import { primaryConversation } from '../_lib/conv-model';
import { sendJson } from '../_lib/conv-http';
import type { ContactDetail, Conversation, Message } from '../_lib/conv-types';
import { useTimedJson } from './use-timed-json';

/**
 * Detalle del contacto activo: conversación visible, mensajes, notas y tareas.
 * Marca la conversación como leída una sola vez por conversación abierta.
 */
export function useContactDetail(contactId: string | null, onRead: (contactId: string) => void) {
  const url = contactId ? `/api/contacts/${encodeURIComponent(contactId)}` : null;
  const query = useTimedJson<ContactDetail>(url, { parse: parseContactDetail, ttlMs: 0 });
  const { data, patch } = query;
  const conversation: Conversation | null = useMemo(
    () => (data ? primaryConversation(data.conversations) : null),
    [data],
  );
  const marked = useRef(new Set<string>());
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;

  const conversationId = conversation?.id ?? null;
  const unread = conversation?.unreadCount ?? 0;

  useEffect(() => {
    if (!contactId || !conversationId || unread === 0 || marked.current.has(conversationId)) return;
    marked.current.add(conversationId);
    void sendJson(`/api/conversations/${encodeURIComponent(conversationId)}`, 'PATCH', { unreadCount: 0 }).then((res) => {
      if (!res.ok) {
        marked.current.delete(conversationId);
        return;
      }
      onReadRef.current(contactId);
      patch((previous) => ({
        ...previous,
        conversations: previous.conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      }));
    });
  }, [contactId, conversationId, unread, patch]);

  /** Añade un mensaje a la conversación visible (tras enviarlo con éxito). */
  const appendMessage = useCallback(
    (message: Message) =>
      patch((previous) => ({
        ...previous,
        conversations: previous.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, message], lastMessageAt: message.createdAt, unreadCount: 0 }
            : c,
        ),
      })),
    [patch, conversationId],
  );

  return {
    detail: data,
    conversation,
    appendMessage,
    patch,
    loading: query.loading,
    error: query.error,
    revalidating: query.revalidating,
    refresh: query.refresh,
  };
}
