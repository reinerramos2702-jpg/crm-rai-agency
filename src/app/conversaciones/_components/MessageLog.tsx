'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { groupByDay } from '../_lib/conv-model';
import type { Message } from '../_lib/conv-types';

interface MessageLogProps {
  contactId: string;
  messages: Message[];
}

/**
 * Historial del hilo. Es la única zona con scroll del panel central; `role="log"`
 * hace que los lectores de pantalla anuncien solo los mensajes que se añaden.
 */
export function MessageLog({ contactId, messages }: MessageLogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const previousContact = useRef<string | null>(null);
  const groups = useMemo(() => groupByDay(messages), [messages]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sameThread = previousContact.current === contactId;
    previousContact.current = contactId;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: sameThread && !calm ? 'smooth' : 'auto' });
  }, [contactId, messages.length]);

  return (
    <div ref={ref} className="cv-log" role="log" aria-label="Mensajes de la conversación" aria-relevant="additions" tabIndex={0}>
      {messages.length === 0 && (
        <p className="cv-log-empty">Todavía no hay mensajes. Escribe el primero abajo.</p>
      )}
      {groups.map((group) => (
        <section key={group.key} className="cv-day" aria-label={group.label}>
          <h3 className="cv-day-label"><span>{group.label}</span></h3>
          <ul className="cv-msgs">
            {group.items.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
