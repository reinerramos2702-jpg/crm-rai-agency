'use client';

import React, { useState } from 'react';
import { Copy, Download, FileSpreadsheet, Tag, Trash2, X } from 'lucide-react';

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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tag.trim()) return;
    onTag(tag);
    setTag('');
  }

  return (
    <div className="mm-batch" role="region" aria-label="Acciones en lote">
      <span className="mm-batch-count" aria-live="polite">
        {count} seleccionado{count === 1 ? '' : 's'}
      </span>
      <button type="button" className="btn-secondary btn-sm" onClick={onCopyLinks}>
        <Copy size={14} /> Copiar enlaces
      </button>
      <button type="button" className="btn-secondary btn-sm" onClick={onDownload} disabled={busy}>
        <Download size={14} /> Descargar
      </button>
      <button type="button" className="btn-secondary btn-sm" onClick={onCsv}>
        <FileSpreadsheet size={14} /> Lista (.csv)
      </button>
      <form className="mm-batch-tag" onSubmit={submit}>
        <input
          className="input"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Etiqueta"
          aria-label="Etiqueta para los seleccionados"
          maxLength={24}
        />
        <button type="submit" className="btn-secondary btn-sm" disabled={!tag.trim()}>
          <Tag size={14} /> Etiquetar
        </button>
      </form>
      {removableCount > 0 && (
        <button type="button" className="btn-danger btn-sm" onClick={onRemoveRefs}>
          <Trash2 size={14} /> Quitar {removableCount} enlace{removableCount === 1 ? '' : 's'}
        </button>
      )}
      <button type="button" className="btn-ghost btn-sm" onClick={onClear}>
        <X size={14} /> Cancelar
      </button>
    </div>
  );
}
