'use client';

import React, { useState } from 'react';
import { Download, Tag, Trash2 } from 'lucide-react';
import { BulkBar } from '../_shared/BulkBar';

interface ContactsBulkProps {
  count: number;
  busy: boolean;
  onClear: () => void;
  onExport: () => void;
  onTag: (tag: string) => void;
  onDelete: () => void;
}

/** Acciones masivas sobre los contactos marcados: etiquetar, exportar CSV y eliminar. */
export function ContactsBulk({ count, busy, onClear, onExport, onTag, onDelete }: ContactsBulkProps) {
  const [tag, setTag] = useState('');
  return (
    <BulkBar count={count} noun={{ one: 'contacto seleccionado', many: 'contactos seleccionados' }} onClear={onClear}>
      <form
        className="crm-bulk-inline"
        onSubmit={(e) => { e.preventDefault(); if (tag.trim()) { onTag(tag); setTag(''); } }}
      >
        <label className="fx-sr-only" htmlFor="crm-bulk-tag">Etiqueta para los contactos seleccionados</label>
        <input id="crm-bulk-tag" className="input" value={tag} maxLength={40} placeholder="Nueva etiqueta" onChange={(e) => setTag(e.target.value)} />
        <button type="submit" className="secondary btn-sm" disabled={busy || !tag.trim()}>
          <Tag size={12} aria-hidden="true" /> Etiquetar
        </button>
      </form>
      <button type="button" className="secondary btn-sm" onClick={onExport}>
        <Download size={12} aria-hidden="true" /> Exportar CSV
      </button>
      <button type="button" className="danger btn-sm" disabled={busy} onClick={onDelete}>
        <Trash2 size={12} aria-hidden="true" /> Eliminar
      </button>
    </BulkBar>
  );
}
