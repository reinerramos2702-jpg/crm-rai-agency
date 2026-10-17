'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { ListState, TabFrame } from './TabFrame';
import { useLinks } from '../_hooks/use-links';
import { normalizeDestination } from '../_lib/conv-forms';

async function copyLink(slug: string) {
  const url = `${window.location.origin}/go/${encodeURIComponent(slug)}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Enlace copiado');
  } catch {
    toast.error('No se pudo copiar. Cópialo manualmente: ' + url);
  }
}

/** Enlaces cortos rastreables para iniciar conversaciones desde campañas. */
export function LinksTab() {
  const { links, hasData, loading, error, refresh, create, remove } = useLinks();
  const [label, setLabel] = useState('');
  const [destination, setDestination] = useState('');
  const [destError, setDestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ready = label.trim().length > 0 && destination.trim().length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || saving) return;
    const normalized = normalizeDestination(destination);
    if (!normalized) {
      setDestError('Escribe una dirección web válida (http o https), por ejemplo https://tuweb.com/oferta.');
      return;
    }
    setDestError(null);
    setSaving(true);
    const ok = await create(label, normalized);
    setSaving(false);
    if (ok) {
      setLabel('');
      setDestination('');
    }
  }

  return (
    <TabFrame intro="Enlaces cortos rastreables para iniciar conversaciones desde campañas.">
      <form className="card cv-form-card" onSubmit={(e) => void submit(e)} noValidate>
        <label htmlFor="cv-ln-label">Nombre</label>
        <input id="cv-ln-label" placeholder="Ej. IG Bio Link" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} />
        <label htmlFor="cv-ln-dest">Destino (URL a la que redirige)</label>
        <input
          id="cv-ln-dest" inputMode="url" placeholder="https://tuweb.com/oferta" maxLength={2000} value={destination}
          aria-invalid={!!destError} aria-describedby={destError ? 'cv-ln-dest-err' : undefined}
          onChange={(e) => setDestination(e.target.value)}
        />
        {destError && <p id="cv-ln-dest-err" className="cv-field-error" role="alert">{destError}</p>}
        <button type="submit" className="primary cv-self-start" disabled={!ready || saving}>
          <Plus size={14} aria-hidden="true" /> Crear enlace
        </button>
      </form>
      <ListState loading={loading} error={error} hasData={hasData} count={links.length} emptyText="Todavía no hay enlaces de activación. Crea el primero arriba." onRetry={() => void refresh()}>
        <ul className="cv-cards">
          {links.map((link) => (
            <li key={link.id} className="card cv-card">
              <div className="cv-card-top">
                <strong>{link.label}</strong>
                <button type="button" className="ghost cv-icon-btn cv-icon-btn--sm" aria-label={`Eliminar enlace: ${link.label}`} onClick={() => void remove(link.id)}>
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
              <p className="cv-card-text cv-truncate" title={link.destination}>→ {link.destination}</p>
              <div className="cv-card-foot">
                <code>/go/{link.slug}</code>
                <span className="badge badge-gold">{link.clicks} clics</span>
                <button type="button" className="ghost cv-icon-btn cv-icon-btn--sm" aria-label={`Copiar enlace de ${link.label}`} onClick={() => void copyLink(link.slug)}>
                  <Copy size={13} aria-hidden="true" />
                </button>
                <a
                  href={`/go/${encodeURIComponent(link.slug)}`} target="_blank" rel="noopener noreferrer"
                  className="btn btn-ghost cv-icon-btn cv-icon-btn--sm" aria-label={`Abrir enlace de ${link.label} en una pestaña nueva`}
                >
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </ListState>
    </TabFrame>
  );
}
