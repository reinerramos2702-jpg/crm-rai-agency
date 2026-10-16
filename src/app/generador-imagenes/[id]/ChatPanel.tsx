'use client';

import React, { useEffect, useRef } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  busy: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

/**
 * Chat del asistente. No tiene scroll propio: el historial crece con la página y el
 * compositor queda fijo (sticky) al borde inferior mientras el chat está a la vista.
 */
export function ChatPanel({ messages, input, busy, onInputChange, onSend }: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  // Sigue la conversación solo si ya estás cerca del final; nunca mueve la página al cargar.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const end = endRef.current;
    if (!end) return;
    const lastIsUser = messages[messages.length - 1]?.role === 'user';
    const nearEnd = end.getBoundingClientRect().top < window.innerHeight + 240;
    if (lastIsUser || nearEnd) end.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages]);

  return (
    <section className="gw-chat card" aria-label="Chat con el asistente" data-tour="gi-chat">
      <div className="gw-chat-log">
        {messages.length === 0 && (
          <div className="muted gw-chat-empty">
            <Sparkles size={24} aria-hidden="true" />
            <p>
              Empieza con el Nodo 1: escribe <strong>«Hagamos la grilla de los 7 días»</strong> para que el
              asistente proponga los temas de la semana.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`} style={{ whiteSpace: 'pre-wrap' }}>
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="chat-bubble assistant">
            <Spinner size="sm" />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="gw-compose"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Escribe tu mensaje…"
          aria-label="Mensaje para el asistente"
          rows={2}
          disabled={busy}
        />
        <button type="submit" className="btn-primary" disabled={busy || !input.trim()} aria-label="Enviar mensaje">
          {busy ? <Spinner size="sm" /> : <Send size={16} />}
        </button>
      </form>
    </section>
  );
}
