'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChat } from 'ai/react';
import { Loader2, Send, RotateCcw, Sparkles, PhoneCall } from 'lucide-react';
import { parseTestError } from '@/lib/agent-test-error';

interface Props {
  agentId: string;
  /** Hay cambios sin guardar: la prueba usa la última configuración guardada. */
  dirty?: boolean;
  /** `voice`: simulador de llamada en texto (sin telefonía real). */
  variant?: 'chat' | 'voice';
  sticky?: boolean;
}

const COPY = {
  chat: {
    title: 'Probar bot',
    empty: 'Escribe un mensaje para probar cómo responde el agente con su personalidad, objetivos y bases de conocimiento actuales.',
    placeholder: 'Escribe un mensaje de prueba...',
  },
  voice: {
    title: 'Simulador de llamada',
    empty: 'Escribe lo que diría la persona que llama. El agente responde con su guion, sus reglas y su base de conocimiento. Es una simulación en texto: no usa telefonía real.',
    placeholder: 'Lo que diría el llamante...',
  },
} as const;

/** Chat de prueba del agente: usa la configuración guardada y las bases de conocimiento vinculadas. */
export function TestChatPanel({ agentId, dirty = false, variant = 'chat', sticky = false }: Props) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, error } = useChat({
    api: `/api/ai-agents/${agentId}/test`,
  });
  const logRef = useRef<HTMLDivElement>(null);
  // «Reiniciar» descarta el error visible; si la prueba vuelve a fallar llega un error nuevo y se muestra.
  const [dismissedError, setDismissedError] = useState<Error | undefined>(undefined);
  const errorInfo = error && error !== dismissedError ? parseTestError(error.message) : null;
  const copy = COPY[variant];
  const Icon = variant === 'voice' ? PhoneCall : Sparkles;

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  return (
    <div className={`card ag-test${sticky ? ' ag-test--sticky' : ''}`}>
      <div className="ag-test-head">
        <div className="row" style={{ gap: 8 }}>
          <Icon size={15} color="var(--rai-gold)" aria-hidden="true" />
          <span style={{ fontWeight: 600 }}>{copy.title}</span>
        </div>
        <button type="button" className="ag-btn ag-btn--ghost" style={{ minHeight: 32, padding: '0 10px' }} onClick={() => { setMessages([]); setDismissedError(error); }} title="Reiniciar conversación">
          <RotateCcw size={13} aria-hidden="true" /> Reiniciar
        </button>
      </div>

      {dirty && (
        <div style={{ fontSize: 12, padding: '8px 16px 0', color: 'var(--rai-warning)' }}>
          Tienes cambios sin guardar: la prueba usará la última configuración guardada.
        </div>
      )}

      <div className="chat-log" ref={logRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '24px 8px' }}>{copy.empty}</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.role === 'user' ? 'user' : 'assistant'}`}>{m.content}</div>
        ))}
        {isLoading && (
          <div className="chat-bubble assistant"><Loader2 className="animate-spin" size={14} aria-label="Escribiendo" /></div>
        )}
        {errorInfo && (
          <div className="chat-bubble assistant" role="alert" style={{ borderColor: 'var(--rai-error)', color: 'var(--rai-error)' }}>
            {errorInfo.message}
            {errorInfo.code === 'missing_api_key' && (
              <>
                {' '}
                <Link href="/keys" style={{ color: 'var(--rai-gold)', textDecoration: 'underline' }}>Ir a Claves de IA</Link>
              </>
            )}
          </div>
        )}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input className="input" aria-label={copy.placeholder} placeholder={copy.placeholder} value={input} onChange={handleInputChange} />
        <button className="ag-btn ag-btn--accent" style={{ padding: '0 12px' }} type="submit" disabled={isLoading || !input.trim()} aria-label="Enviar">
          <Send size={14} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
