'use client';

import React, { useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { AVAILABLE_MODELS, CHAT_SUGGESTIONS } from './constants';
import { PlanPreview } from './PlanPreview';
import { RichText } from './RichText';
import type { Campaign, ChatMessage } from './types';

interface PlannerViewProps {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  model: string;
  campaign: Campaign | null;
  onInput: (value: string) => void;
  onModel: (model: string) => void;
  onSend: () => void;
}

export function PlannerView({ messages, input, loading, model, campaign, onInput, onModel, onSend }: PlannerViewProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Baja al último mensaje solo cuando llega uno nuevo (no al abrir la vista con historial).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages.length, loading]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend();
  };

  return (
    <div className="rai-planner">
      <section className="card rai-chat" data-tour="chat" aria-label="Planificador de contenido con IA">
        <div className="rai-chat-head">
          <span className="rai-chat-ico" aria-hidden="true"><MessageSquare size={16} /></span>
          <div className="rai-chat-title">
            <span>Planificador de contenido IG</span>
            <small><i className="rai-live" aria-hidden="true" /> Asistente listo</small>
          </div>
          <label className="ig-model">
            <span className="fx-sr-only">Modelo de IA</span>
            <select className="input" value={model} onChange={(e) => onModel(e.target.value)}>
              {AVAILABLE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label} ({m.provider})</option>)}
            </select>
          </label>
        </div>

        <div className="rai-chat-msgs" role="log" aria-live="polite" aria-label="Conversación">
          {messages.map((msg, i) => (
            <div key={i} className={`rai-msg ${msg.role === 'user' ? 'is-user' : 'is-ai'}`}>
              <RichText text={msg.content} />
            </div>
          ))}
          {loading && (
            <div className="rai-msg is-ai ig-typing" role="status" aria-label="El asistente está escribiendo">
              <span /><span /><span />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="rai-chat-input ig-composer" onSubmit={submit}>
          {messages.length <= 1 && !input && (
            <div className="ig-suggest" role="group" aria-label="Sugerencias para empezar">
              {CHAT_SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => onInput(s)}>{s}</button>
              ))}
            </div>
          )}
          <div className="ig-composer-row">
            <input
              className="input"
              aria-label="Mensaje para el asistente"
              placeholder="Describe tu negocio, tu audiencia, tus servicios…"
              value={input}
              onChange={(e) => onInput(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="primary" aria-label="Enviar mensaje" disabled={loading || !input.trim()}>
              <Send size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>

      <PlanPreview campaign={campaign} />
    </div>
  );
}
