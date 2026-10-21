'use client';

import React from 'react';
import { X } from 'lucide-react';
import { RANGES, type MediaView } from '@/lib/media-filter';
import { ORIGIN_LABELS } from '@/lib/media-types';

interface ActiveFiltersProps {
  view: MediaView;
  onOrigin: () => void;
  onRange: () => void;
  onTag: () => void;
  onClear: () => void;
}

/** Resumen de los filtros activos con el panel cerrado: cada chip se quita con un clic. */
export function ActiveFilters({ view, onOrigin, onRange, onTag, onClear }: ActiveFiltersProps) {
  const chips: Array<{ key: string; label: string; remove: () => void }> = [];
  if (view.origin !== 'all') chips.push({ key: 'origin', label: `Origen: ${ORIGIN_LABELS[view.origin]}`, remove: onOrigin });
  if (view.range !== 'all') {
    const days = RANGES.find((r) => r.value === view.range)?.label ?? '';
    chips.push({ key: 'range', label: `Últimos ${days}`, remove: onRange });
  }
  if (view.tag !== '') chips.push({ key: 'tag', label: `Etiqueta: ${view.tag}`, remove: onTag });
  if (chips.length === 0) return null;

  return (
    <div className="mm-active" role="group" aria-label="Filtros activos">
      {chips.map((c) => (
        <button key={c.key} type="button" className="mm-chip is-plain is-active" aria-label={`Quitar filtro: ${c.label}`} onClick={c.remove}>
          {c.label} <X size={13} aria-hidden="true" />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" className="btn-ghost btn-sm" onClick={onClear}>
          Quitar todos
        </button>
      )}
    </div>
  );
}
