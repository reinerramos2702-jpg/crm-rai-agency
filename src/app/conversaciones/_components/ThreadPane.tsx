'use client';

import React from 'react';
import { ArrowLeft, PanelRight, Paperclip, Star } from 'lucide-react';
import { Avatar } from './Avatar';
import { Composer } from './Composer';
import { InlineError } from './InlineError';
import { MessageLog } from './MessageLog';
import { statusMeta } from '../_lib/conv-model';
import type { ContactDetail, Conversation } from '../_lib/conv-types';

interface ThreadPaneProps {
  detail: ContactDetail;
  conversation: Conversation | null;
  error: string | null;
  revalidating: boolean;
  onRetry: () => void;
  draft: string;
  onDraft: (value: string) => void;
  sending: boolean;
  onSend: () => void;
  onSimulate: () => void;
  onBack: () => void;
  onOpenRail: () => void;
}

/** Hilo de la conversación activa: cabecera, historial y compositor. */
export function ThreadPane(props: ThreadPaneProps) {
  const { detail, conversation, error, revalidating, onRetry } = props;
  const status = conversation ? statusMeta(conversation.status) : null;
  const contactLine = detail.email || detail.phone || 'Sin datos de contacto';

  return (
    <section className="cv-col cv-thread" aria-labelledby="cv-thread-title">
      <header className="cv-thread-head">
        <button type="button" className="ghost cv-icon-btn cv-back" aria-label="Volver a la lista de conversaciones" onClick={props.onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <Avatar name={detail.name} />
        <div className="cv-thread-id">
          <h2 id="cv-thread-title" className="cv-thread-name">{detail.name}</h2>
          <p className="cv-thread-sub">
            {contactLine} · canal: {conversation?.channel ?? 'manual'}
            {status && (
              <>
                {' · '}
                <span className="cv-status" data-tone={status.tone}>{status.label}</span>
              </>
            )}
          </p>
        </div>
        <div className="cv-thread-actions">
          <button type="button" className="ghost cv-icon-btn" aria-label="Destacar conversación (próximamente)" disabled>
            <Star size={15} aria-hidden="true" />
          </button>
          <button type="button" className="ghost cv-icon-btn" aria-label="Adjuntar archivo (próximamente)" disabled>
            <Paperclip size={15} aria-hidden="true" />
          </button>
          <button type="button" className="ghost cv-icon-btn cv-open-rail" aria-label="Abrir notas, tareas y datos del contacto" onClick={props.onOpenRail}>
            <PanelRight size={15} aria-hidden="true" />
          </button>
        </div>
      </header>
      {error && <InlineError compact title="No se pudo actualizar la conversación" message={error} onRetry={onRetry} busy={revalidating} />}
      {conversation ? (
        <MessageLog contactId={detail.id} messages={conversation.messages} />
      ) : (
        <div className="cv-log">
          <p className="cv-log-empty">Este contacto todavía no tiene una conversación abierta.</p>
        </div>
      )}
      <Composer
        draft={props.draft}
        onDraft={props.onDraft}
        enabled={conversation !== null}
        sending={props.sending}
        onSend={props.onSend}
        onSimulate={props.onSimulate}
      />
    </section>
  );
}
