import React from 'react';
import Link from 'next/link';
import { Bot, PhoneCall, MessageSquare, BookOpen, ArrowRight } from 'lucide-react';

export const NEW_CHAT_HREF = '/agentes-ia/nuevo/chat';
export const NEW_VOICE_HREF = '/agentes-ia/nuevo/voz';

/** Dos botones distintos, cada uno con su propio flujo (enlaces: no comparten estado). */
export function NewAgentButtons() {
  return (
    <div className="ag-head-actions">
      <Link href="/agentes-ia/base-conocimiento" className="ag-btn ag-btn--ghost">
        <BookOpen size={14} aria-hidden="true" /> Base de conocimiento
      </Link>
      <Link href={NEW_VOICE_HREF} className="ag-btn ag-btn--voice">
        <PhoneCall size={14} aria-hidden="true" /> Nuevo agente de voz
      </Link>
      <Link href={NEW_CHAT_HREF} className="ag-btn ag-btn--chat">
        <Bot size={14} aria-hidden="true" /> Nuevo agente
      </Link>
    </div>
  );
}

/** Tarjetas grandes del estado vacío: explican la diferencia entre los dos tipos. */
export function AgentTypeCards() {
  return (
    <div className="ag-types">
      <Link href={NEW_CHAT_HREF} className="ag-type">
        <span className="ag-type-icon" aria-hidden="true"><MessageSquare size={20} /></span>
        <span className="ag-type-title">Agente de chat</span>
        <span className="muted" style={{ fontSize: 13 }}>
          Responde por escrito en el chat web, WhatsApp, Instagram y más. Se entrena con tu base de conocimiento.
        </span>
        <span className="ag-type-cta">Crear agente de chat <ArrowRight size={13} aria-hidden="true" style={{ verticalAlign: -2 }} /></span>
      </Link>
      <Link href={NEW_VOICE_HREF} className="ag-type ag-type--voice">
        <span className="ag-type-icon" aria-hidden="true"><PhoneCall size={20} /></span>
        <span className="ag-type-title">Agente de voz</span>
        <span className="muted" style={{ fontSize: 13 }}>
          Atiende las llamadas telefónicas de tu empresa con una voz de IA y responde con tu base de conocimiento.
        </span>
        <span className="ag-type-cta">Crear agente de voz <ArrowRight size={13} aria-hidden="true" style={{ verticalAlign: -2 }} /></span>
      </Link>
    </div>
  );
}
