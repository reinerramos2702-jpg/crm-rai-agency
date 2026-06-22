'use client';

import React, { useRef, useEffect } from 'react';
import { Bot, Send } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PlanningChatProps {
  messages: Message[];
  input: string;
  busy: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Componente reutilizable de chat para la fase de planificación.
 * Muestra burbujas de conversación con scroll automático.
 */
export function PlanningChat({
  messages,
  input,
  busy,
  onInputChange,
  onSend,
  placeholder = 'Describe tu marca o campaña...',
  disabled = false,
}: PlanningChatProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-container" style={{ height: '100%' }}>
      {/* Mensajes */}
      <div ref={logRef} className="chat-log">
        {messages.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="chat-bubble assistant">
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <Bot size={12} color="var(--rai-purple)" />
                <span style={{ fontSize: 11, color: 'var(--rai-purple)', fontWeight: 600 }}>IA</span>
              </div>
              <p style={{ lineHeight: 1.7 }}>
                Hola, soy tu IA de contenido. Dime sobre tu marca y te ayudo a planificar hasta 31 días de contenido automatizado. ¿Por dónde empezamos?
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div className={`chat-bubble ${msg.role}`} style={{ maxWidth: '80%', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <Bot size={12} color="var(--rai-purple)" />
                  <span style={{ fontSize: 11, color: 'var(--rai-purple)', fontWeight: 600 }}>IA</span>
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {busy && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Spinner size="sm" />
            <span style={{ fontSize: 12, color: 'var(--rai-muted)' }}>Generando respuesta...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="chat-input-row">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!busy && !disabled && input.trim()) onSend();
            }
          }}
          placeholder={placeholder}
          style={{ flex: 1, minHeight: 48, maxHeight: 120, resize: 'none', fontSize: 14 }}
          rows={2}
          disabled={disabled}
        />
        <button
          onClick={onSend}
          disabled={busy || !input.trim() || disabled}
          className="btn btn-primary"
          style={{ height: 48, padding: '0 16px', flexShrink: 0 }}
        >
          {busy ? <Spinner size="sm" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
