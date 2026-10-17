'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { sendJson } from '../_lib/conv-http';
import { parseMessageResult } from '../_lib/conv-parse';
import type { Message, MessageSender } from '../_lib/conv-types';

/** Envío de mensajes a la conversación activa. Devuelve true si el servidor lo guardó. */
export function useSendMessage(conversationId: string | null, onSent: (message: Message) => void) {
  const [sending, setSending] = useState(false);

  const send = useCallback(
    async (body: string, sender: MessageSender = 'agent'): Promise<boolean> => {
      const text = body.trim();
      if (!text || !conversationId) return false;
      setSending(true);
      const res = await sendJson(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, 'POST', {
        body: text,
        sender,
      });
      setSending(false);
      const message = res.ok ? parseMessageResult(res.data) : null;
      if (!message) {
        toast.error(res.ok ? 'El servidor devolvió una respuesta inesperada.' : res.message);
        return false;
      }
      onSent(message);
      return true;
    },
    [conversationId, onSent],
  );

  return { sending, send };
}
