'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface ViewerTagsProps {
  itemId: string;
  tags: readonly string[];
  onAdd: (id: string, tag: string) => void;
  onRemove: (id: string, tag: string) => void;
}

/** Etiquetas del activo abierto (solo en este navegador). */
export function ViewerTags({ itemId, tags, onAdd, onRemove }: ViewerTagsProps) {
  const [draft, setDraft] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    onAdd(itemId, draft);
    setDraft('');
  }

  return (
    <form className="mm-viewer-tags" onSubmit={submit}>
      {tags.map((t) => (
        <span key={t} className="mm-tag">
          {t}
          <button type="button" className="mm-tag-x" aria-label={`Quitar la etiqueta ${t}`} onClick={() => onRemove(itemId, t)}>
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        className="input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Añadir etiqueta"
        aria-label="Añadir etiqueta (solo en este navegador)"
        maxLength={24}
      />
      <button type="submit" className="btn-ghost btn-sm" disabled={!draft.trim()}>
        <Plus size={14} /> Etiquetar
      </button>
    </form>
  );
}
