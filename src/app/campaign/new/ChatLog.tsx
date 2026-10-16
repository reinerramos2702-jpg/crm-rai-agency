'use client';

import { useEffect, useRef } from 'react';
import { Bot, Paperclip } from 'lucide-react';
import type { ChatMessage } from './hooks/useCampaignSession';

interface ChatLogProps {
  messages: ChatMessage[];
  busy: boolean;
  isDragging: boolean;
  /** Frase adicional del saludo según lo que ya se investigó. */
  greetingExtra: string;
}

function Typing() {
  return (
    <span className="cn-typing" role="status" aria-label="La IA está pensando">
      <span /><span /><span />
    </span>
  );
}

/**
 * Historial del chat. Sin scroll propio: crece con el contenido y la página se desplaza.
 * Si la persona está cerca del final, los mensajes nuevos se mantienen a la vista.
 */
export function ChatLog({ messages, busy, isDragging, greetingExtra }: ChatLogProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      stick.current = doc.scrollHeight - (window.scrollY + window.innerHeight) < 260;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const last = messages[messages.length - 1];
  useEffect(() => {
    if (messages.length === 0) return;
    if (stick.current || last?.role === 'user') endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, last?.role]);

  return (
    <div
      className="chat-log cn-chat-log"
      data-tour="cn-chat-log"
      role="log"
      aria-live="polite"
      aria-busy={busy}
      aria-label="Conversación con la IA"
    >
      {isDragging && (
        <div className="cn-drop" aria-hidden="true">
          <Paperclip size={28} />
          <p>Suelta los archivos aquí</p>
        </div>
      )}

      {messages.length === 0 && (
        <div className="cn-msg is-assistant">
          <div className="chat-bubble assistant">
            <div className="cn-bubble-who"><Bot size={14} aria-hidden="true" /><span>IA</span></div>
            <p className="cn-greeting">
              Hola, soy tu IA de contenido. Dime sobre tu marca y te ayudo a planificar hasta 31 días de contenido.
              {greetingExtra}
            </p>
            <p className="cn-hint">Tip: arrastra archivos al chat o usa el clip para adjuntarlos.</p>
          </div>
        </div>
      )}

      {messages.map((msg, i) => {
        const pending = busy && i === messages.length - 1 && msg.role === 'assistant' && !msg.content;
        return (
          <div key={i} className={`cn-msg is-${msg.role}`}>
            <div className={`chat-bubble ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="cn-bubble-who"><Bot size={12} aria-hidden="true" /><span>IA</span></div>
              )}
              {pending ? <Typing /> : <span className="cn-bubble-text">{msg.content}</span>}
            </div>
          </div>
        );
      })}

      <div ref={endRef} className="cn-log-end" aria-hidden="true" />
    </div>
  );
}
