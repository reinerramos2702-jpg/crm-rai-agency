'use client';

import React, { useMemo } from 'react';
import { ClipboardCopy, Download as DownloadIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { CAPTION_LIMIT, assessCopy, type CheckState } from '@/lib/grid-quality';
import { findCopysInMessages } from '@/lib/grid-copy-parse';
import type { ChatMessage, ThemeEntry } from '../types';
import { copyToClipboard } from '../utils';

interface CopyPanelProps {
  day: number;
  themes: ThemeEntry[];
  brandText: string | null;
  messages: ChatMessage[];
  onCaptionChange: (day: number, value: string) => void;
  onImport: (copys: Array<string | null>) => void;
  onSelectDay: (day: number) => void;
}

const DOT: Record<CheckState, string> = {
  ok: 'fx-dot--ok',
  warn: 'fx-dot--warn',
  bad: 'fx-dot--danger',
  skip: '',
};

const STATE_TEXT: Record<CheckState, string> = {
  ok: 'correcto',
  warn: 'mejorable',
  bad: 'a corregir',
  skip: 'sin evaluar',
};

/** Copy del día con control de calidad sutil: puntaje y pistas accionables. */
export function CopyPanel({ day, themes, brandText, messages, onCaptionChange, onImport, onSelectDay }: CopyPanelProps) {
  const caption = themes[day]?.caption ?? '';
  const results = useMemo(() => themes.map((t) => assessCopy(t.caption ?? '', brandText)), [themes, brandText]);
  const result = results[day] ?? null;
  const fromChat = useMemo(() => findCopysInMessages(messages, themes.length), [messages, themes.length]);
  const importable = fromChat?.filter(Boolean).length ?? 0;

  // Las pistas pendientes van primero; las correctas quedan al final.
  const checks = result ? [...result.checks].sort((a, b) => Number(a.state === 'ok') - Number(b.state === 'ok')) : [];

  async function copyOne() {
    const ok = await copyToClipboard(caption);
    toast[ok ? 'success' : 'error'](ok ? 'Copy copiado' : 'No se pudo copiar: selecciona el texto manualmente');
  }

  function importFromChat() {
    if (!fromChat) return;
    const overwrites = fromChat.some((c, i) => c && themes[i]?.caption?.trim());
    if (overwrites && !confirm('Algunos días ya tienen copy y se reemplazarán por el del chat. ¿Continuar?')) return;
    onImport(fromChat);
  }

  return (
    <div className="gw-copy">
      <div className="row-between gw-label">
        <p className="label" style={{ margin: 0 }}>
          Copy del día {day + 1}
        </p>
        <button className="btn-ghost btn-sm" onClick={() => void copyOne()} disabled={!caption.trim()}>
          <ClipboardCopy size={13} /> Copiar
        </button>
      </div>

      <textarea
        aria-label={`Copy del día ${day + 1}`}
        value={caption}
        onChange={(e) => onCaptionChange(day, e.target.value)}
        placeholder="Pega o escribe el caption final con sus hashtags. También puedes traerlo del chat."
        rows={9}
        maxLength={CAPTION_LIMIT + 400}
      />
      <div className="row-between gw-counter">
        <span className={caption.length > CAPTION_LIMIT ? 'is-over' : ''}>
          {caption.length.toLocaleString('es')} / {CAPTION_LIMIT.toLocaleString('es')}
        </span>
        {importable > 0 && (
          <button className="btn-secondary btn-sm" onClick={importFromChat}>
            <DownloadIcon size={13} /> Traer {importable} copy{importable === 1 ? '' : 's'} del chat
          </button>
        )}
      </div>

      {result ? (
        <div className={`gw-quality is-${result.level}`} aria-label="Control de calidad del copy">
          <div className="row-between">
            <span className="label" style={{ margin: 0 }}>Calidad</span>
            <span className="gw-quality-score">{result.score}<small>/100</small></span>
          </div>
          <div className="gw-quality-bar" aria-hidden="true">
            <span style={{ width: `${result.score}%` }} />
          </div>
          <ul className="gw-checks">
            {checks.map((c) => (
              <li key={c.id}>
                <span className={`fx-dot ${DOT[c.state]}`} role="img" aria-label={`${c.label}: ${STATE_TEXT[c.state]}`} />
                <span>
                  <strong>{c.label}.</strong> <span className="muted">{c.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted gw-quality-empty">Escribe el copy para ver su puntaje de calidad y sugerencias.</p>
      )}

      <p className="label gw-label" style={{ marginTop: 18 }}>Todos los días</p>
      <ul className="gw-copy-days">
        {themes.map((t, i) => {
          const r = results[i];
          return (
            <li key={i}>
              <button
                type="button"
                className={`gw-copy-day${i === day ? ' is-selected' : ''}`}
                aria-pressed={i === day}
                onClick={() => onSelectDay(i)}
              >
                <span className="gw-copy-day-n">Día {i + 1}</span>
                <span className="gw-copy-day-title">{t.title?.trim() || 'Sin tema'}</span>
                <span className={`gw-copy-day-score${r ? ` is-${r.level}` : ''}`}>{r ? r.score : '—'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
