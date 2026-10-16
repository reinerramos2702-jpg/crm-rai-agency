'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Folder, Send } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { COUNTER_FROM, SOFT_CHAR_LIMIT } from '@/lib/campaign-chat';
import { AttachmentChips } from './AttachmentChips';
import type { Attachments } from './hooks/useAttachments';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  busy: boolean;
  attachments: Attachments;
  suggestions: string[];
  onAttachClick: () => void;
}

const MAX_HEIGHT = 160;

/** Compositor fijo al borde inferior de la pantalla mientras el chat está a la vista. */
export function Composer(p: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { value, attachments } = p;

  // Crece con el texto hasta un tope; después aparece su propio scroll.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter, Ctrl+Enter y Cmd+Enter envían; Shift+Enter inserta salto de línea.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      p.onSend();
    }
  }

  const showCounter = value.length >= COUNTER_FROM;
  const overSoft = value.length > SOFT_CHAR_LIMIT;

  return (
    <div className="cn-composer">
      {p.suggestions.length > 0 && !p.busy && (
        <div className="cn-suggest" role="group" aria-label="Respuestas sugeridas">
          {p.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                p.onChange(s);
                ref.current?.focus();
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <AttachmentChips files={attachments.files} onRemove={attachments.removeFile} />

      <div className="cn-compose-row" data-tour="cn-chat-input">
        <button
          type="button"
          onClick={p.onAttachClick}
          title="Adjuntar archivos"
          aria-label="Adjuntar archivos"
          className="cn-attach-btn"
          data-active={attachments.files.length > 0}
        >
          <Folder size={18} aria-hidden="true" />
        </button>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => p.onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe la marca, audiencia, objetivos..."
          aria-label="Mensaje para la IA"
          rows={2}
        />
        <button
          type="button"
          onClick={p.onSend}
          disabled={!p.canSend}
          className="btn btn-primary cn-send"
          aria-label={p.busy ? 'Enviando' : 'Enviar mensaje'}
        >
          {p.busy ? <Spinner size="sm" /> : <Send size={16} aria-hidden="true" />}
        </button>
      </div>

      <div className="cn-compose-meta">
        <span>
          {attachments.isReading ? 'Leyendo adjuntos…' : 'Enter o Ctrl/Cmd+Enter envía · Shift+Enter nueva línea'}
        </span>
        {showCounter && (
          <span className={overSoft ? 'is-warn' : undefined} role="status">
            {value.length.toLocaleString('es')} / {SOFT_CHAR_LIMIT.toLocaleString('es')}
            {overSoft ? ' · mensaje largo, consume más' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
