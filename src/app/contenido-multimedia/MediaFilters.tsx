'use client';

import React, { useState } from 'react';
import { Bookmark, Trash2, X } from 'lucide-react';
import { RANGES, type MediaOriginFilter, type MediaRange, type MediaView } from '@/lib/media-filter';
import type { SavedView } from '@/lib/media-local';
import { MEDIA_ORIGINS, ORIGIN_LABELS } from '@/lib/media-types';

interface MediaFiltersProps {
  view: MediaView;
  originCounts: Record<MediaOriginFilter, number>;
  tags: Array<{ tag: string; count: number }>;
  savedViews: SavedView[];
  hasFilters: boolean;
  onOrigin: (origin: MediaOriginFilter) => void;
  onRange: (range: MediaRange) => void;
  onTag: (tag: string) => void;
  onClear: () => void;
  onSaveView: (name: string) => void;
  onApplyView: (view: SavedView['view']) => void;
  onDeleteView: (name: string) => void;
}

/**
 * Filtros reales sobre los datos que existen: origen, fecha y etiqueta local,
 * más vistas guardadas (se conservan solo en este navegador).
 */
export function MediaFilters({
  view,
  originCounts,
  tags,
  savedViews,
  hasFilters,
  onOrigin,
  onRange,
  onTag,
  onClear,
  onSaveView,
  onApplyView,
  onDeleteView,
}: MediaFiltersProps) {
  const [name, setName] = useState('');
  const origins = MEDIA_ORIGINS.filter((o) => originCounts[o] > 0 || view.origin === o);
  const activeTag = view.tag.toLowerCase();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveView(name);
    setName('');
  }

  return (
    <div className="mm-panel fx-field-in" id="mm-filters">
      <div className="mm-panel-row">
        <span className="mm-panel-label" id="mm-lbl-origin">Origen</span>
        <div className="mm-chips" role="group" aria-labelledby="mm-lbl-origin">
          <button type="button" className="mm-chip" aria-pressed={view.origin === 'all'} onClick={() => onOrigin('all')}>
            Todos <span className="mm-count">{originCounts.all}</span>
          </button>
          {origins.map((o) => (
            <button key={o} type="button" className="mm-chip" aria-pressed={view.origin === o} onClick={() => onOrigin(o)}>
              {ORIGIN_LABELS[o]} <span className="mm-count">{originCounts[o]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mm-panel-row">
        <span className="mm-panel-label" id="mm-lbl-range">Fecha</span>
        <div className="mm-chips" role="group" aria-labelledby="mm-lbl-range">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              className="mm-chip is-plain"
              aria-pressed={view.range === r.value}
              onClick={() => onRange(r.value)}
            >
              {r.value === 'all' ? 'Cualquier fecha' : `Últimos ${r.label}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mm-panel-row">
        <span className="mm-panel-label" id="mm-lbl-tags">Etiquetas · solo en este navegador</span>
        {tags.length === 0 ? (
          <p className="muted mm-panel-hint">Aún no hay etiquetas. Ábrelas desde el visor o selecciona varios activos y etiquétalos en lote.</p>
        ) : (
          <div className="mm-chips" role="group" aria-labelledby="mm-lbl-tags">
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                className="mm-chip"
                aria-pressed={activeTag === tag.toLowerCase()}
                onClick={() => onTag(activeTag === tag.toLowerCase() ? '' : tag)}
              >
                {tag} <span className="mm-count">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mm-panel-row">
        <span className="mm-panel-label">Vistas guardadas · solo en este navegador</span>
        <div className="mm-saved">
          {savedViews.length === 0 && <p className="muted mm-panel-hint">Guarda la búsqueda, el orden y los filtros actuales para volver a ellos en un clic.</p>}
          {savedViews.map((sv) => (
            <span key={sv.name} className="mm-saved-item">
              <button type="button" className="mm-chip is-plain" onClick={() => onApplyView(sv.view)}>
                <Bookmark size={13} aria-hidden="true" /> {sv.name}
              </button>
              <button type="button" className="mm-saved-del" aria-label={`Eliminar la vista ${sv.name}`} onClick={() => onDeleteView(sv.name)}>
                <Trash2 size={13} />
              </button>
            </span>
          ))}
          <form className="mm-saved-form" onSubmit={submit}>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la vista"
              aria-label="Nombre para guardar la vista actual"
              maxLength={30}
            />
            <button type="submit" className="btn-secondary btn-sm" disabled={!name.trim()}>
              Guardar vista
            </button>
          </form>
        </div>
      </div>

      {hasFilters && (
        <div className="mm-panel-foot">
          <button type="button" className="btn-ghost btn-sm" onClick={onClear}>
            <X size={14} /> Quitar filtros
          </button>
        </div>
      )}
    </div>
  );
}
