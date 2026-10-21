'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ListState, TabFrame } from './TabFrame';
import { useSnippets } from '../_hooks/use-snippets';

/** Respuestas rápidas reutilizables en cualquier conversación. */
export function SnippetsTab({ onUse }: { onUse: (body: string) => void }) {
  const { snippets, hasData, loading, error, refresh, create, remove } = useSnippets();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const ready = title.trim().length > 0 && body.trim().length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    const ok = await create(title, body);
    setSaving(false);
    if (ok) {
      setTitle('');
      setBody('');
    }
  }

  return (
    <TabFrame intro="Guarda respuestas rápidas para reutilizar en tus conversaciones.">
      <form className="card cv-form-card" onSubmit={(e) => void submit(e)}>
        <label htmlFor="cv-sn-title">Título</label>
        <input id="cv-sn-title" placeholder="Ej. CTA — Compra ahora" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="cv-sn-body">Contenido</label>
        <textarea id="cv-sn-body" rows={3} placeholder="Contenido del fragmento…" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="submit" className="primary cv-self-start" disabled={!ready || saving}>
          <Plus size={14} aria-hidden="true" /> Agregar fragmento
        </button>
      </form>
      <ListState loading={loading} error={error} hasData={hasData} count={snippets.length} emptyText="Todavía no hay fragmentos. Crea el primero arriba." onRetry={() => void refresh()}>
        <ul className="cv-cards">
          {snippets.map((snippet) => (
            <li key={snippet.id} className="card cv-card">
              <div className="cv-card-top">
                <strong>{snippet.title}</strong>
                <button type="button" className="ghost cv-icon-btn cv-icon-btn--sm" aria-label={`Eliminar fragmento: ${snippet.title}`} onClick={() => void remove(snippet.id)}>
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
              <p className="cv-card-text">{snippet.body}</p>
              <button type="button" className="ghost btn-sm cv-self-start" onClick={() => onUse(snippet.body)}>Usar en chat</button>
            </li>
          ))}
        </ul>
      </ListState>
    </TabFrame>
  );
}
