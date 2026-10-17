'use client';

import React, { useEffect, useRef } from 'react';
import { RefreshCcw, Send } from 'lucide-react';
import { MAX_MESSAGE_LENGTH } from '../_lib/conv-forms';

interface ComposerProps {
  draft: string;
  onDraft: (value: string) => void;
  /** Hay una conversación a la que escribir. */
  enabled: boolean;
  sending: boolean;
  onSend: () => void;
  onSimulate: () => void;
}

const MAX_HEIGHT = 140;

/** Compositor: Enter envía, Mayús+Enter inserta un salto de línea. */
export function Composer({ draft, onDraft, enabled, sending, onSend, onSimulate }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = enabled && !sending && draft.trim().length > 0;

  // Al terminar un envío el foco vuelve al campo (el botón se deshabilita y lo perdería).
  const wasSending = useRef(false);
  useEffect(() => {
    if (wasSending.current && !sending) ref.current?.focus();
    wasSending.current = sending;
  }, [sending]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [draft]);

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSend) onSend();
  }

  const placeholder = !enabled ? 'Abre una conversación para escribir' : sending ? 'Enviando…' : 'Escribir un mensaje…';

  return (
    <form
      className="cv-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSend();
      }}
    >
      <div className="cv-composer-row">
        <label htmlFor="cv-composer-input" className="fx-sr-only">Escribir un mensaje</label>
        <textarea
          id="cv-composer-input"
          ref={ref}
          rows={1}
          className="cv-composer-input"
          placeholder={placeholder}
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={!enabled}
          readOnly={sending}
          aria-busy={sending}
          aria-describedby="cv-composer-hint"
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {enabled && (
          <button
            type="button"
            className="ghost cv-icon-btn cv-tip"
            data-tip="Simular respuesta del cliente (pruebas)"
            aria-label="Simular respuesta del cliente (solo para pruebas)"
            onClick={onSimulate}
            disabled={sending}
          >
            <RefreshCcw size={15} aria-hidden="true" />
          </button>
        )}
        <button type="submit" className="primary cv-send" aria-label="Enviar mensaje" disabled={!canSend}>
          <Send size={16} aria-hidden="true" />
        </button>
      </div>
      <p id="cv-composer-hint" className="cv-composer-hint">
        <kbd>Enter</kbd> envía · <kbd>Mayús</kbd> + <kbd>Enter</kbd> salto de línea
        {draft.length > MAX_MESSAGE_LENGTH - 400 && (
          <span className="cv-composer-count"> · {draft.length}/{MAX_MESSAGE_LENGTH}</span>
        )}
      </p>
    </form>
  );
}
