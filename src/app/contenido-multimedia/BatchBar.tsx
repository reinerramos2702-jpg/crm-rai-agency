'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Copy, Download, FileSpreadsheet, Tag, Trash2, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { isTypingTarget } from './browser-actions';

interface BatchBarProps {
  count: number;
  /** Cuántos de los seleccionados son enlaces añadidos a mano (los únicos que se pueden quitar). */
  removableCount: number;
  busy: boolean;
  onClear: () => void;
  onCopyLinks: () => void;
  onCsv: () => void;
  onDownload: () => void;
  onTag: (tag: string) => void;
  onRemoveRefs: () => void;
}

/** Acciones en lote sobre la selección. Solo se ofrece lo que funciona hoy con los datos existentes. */
export function BatchBar({ count, removableCount, busy, onClear, onCopyLinks, onCsv, onDownload, onTag, onRemoveRefs }: BatchBarProps) {
  const [tag, setTag] = useState('');
  const [tagging, setTagging] = useState(false);
  const tagInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tagging) tagInput.current?.focus();
  }, [tagging]);

  // Esc deshace la selección, salvo que haya una ventana abierta o se esté escribiendo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isTypingTarget(e.target) || document.querySelector('[aria-modal="true"]')) return;
      onClear();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClear]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tag.trim()) return;
    onTag(tag);
    setTag('');
    setTagging(false);
  }

  const removeLabel = `Quitar ${removableCount} enlace${removableCount === 1 ? '' : 's'}`;

  return (
    <div className="mm-batch" role="region" aria-label="Acciones en lote">
      <div className="mm-batch-main">
        <span className="mm-batch-count" aria-live="polite">
          <strong>{count}</strong> seleccionado{count === 1 ? '' : 's'}
        </span>
        <button type="button" className="btn-secondary btn-sm mm-act" onClick={onCopyLinks} title="Copiar enlaces">
          <Copy size={14} /> <span className="mm-act-label">Copiar enlaces</span>
        </button>
        <button type="button" className="btn-secondary btn-sm mm-act" onClick={onDownload} disabled={busy} title="Descargar">
          {busy ? <Spinner size="sm" /> : <Download size={14} />} <span className="mm-act-label">{busy ? 'Descargando…' : 'Descargar'}</span>
        </button>
        <button type="button" className="btn-secondary btn-sm mm-act" onClick={onCsv} title="Lista (.csv)">
          <FileSpreadsheet size={14} /> <span className="mm-act-label">Lista (.csv)</span>
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm mm-act"
          aria-expanded={tagging}
          aria-controls="mm-batch-tag"
          onClick={() => setTagging((v) => !v)}
          title="Etiquetar"
        >
          <Tag size={14} /> <span className="mm-act-label">Etiquetar</span>
        </button>
        {removableCount > 0 && (
          <button type="button" className="btn-danger btn-sm mm-act" onClick={onRemoveRefs} title={removeLabel}>
            <Trash2 size={14} /> <span className="mm-act-label">{removeLabel}</span>
          </button>
        )}
        <button type="button" className="btn-ghost btn-sm mm-act" onClick={onClear} title="Cancelar selección (Esc)">
          <X size={14} /> <span className="mm-act-label">Cancelar</span>
        </button>
      </div>
      {tagging && (
        <form
          id="mm-batch-tag"
          className="mm-batch-tag fx-field-in"
          onSubmit={submit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setTagging(false);
            }
          }}
        >
          <input
            ref={tagInput}
            className="input"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Nueva etiqueta para los seleccionados"
            aria-label="Etiqueta para los seleccionados"
            maxLength={24}
          />
          <button type="submit" className="btn-primary btn-sm" disabled={!tag.trim()}>
            Aplicar
          </button>
        </form>
      )}
    </div>
  );
}
