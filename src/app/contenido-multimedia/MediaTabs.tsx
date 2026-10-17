'use client';

import React from 'react';
import { MEDIA_KINDS, KIND_LABELS, type MediaKind } from '@/lib/media-types';
import { KIND_ICONS } from './kind-icons';

interface MediaTabsProps {
  active: MediaKind;
  counts: Record<MediaKind, number> | null;
  onChange: (kind: MediaKind) => void;
}

/** Pestañas por tipo con conteos reales (cada una respeta la búsqueda y los filtros activos). */
export function MediaTabs({ active, counts, onChange }: MediaTabsProps) {
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = MEDIA_KINDS.indexOf(active);
    const next = MEDIA_KINDS[(i + (e.key === 'ArrowRight' ? 1 : -1) + MEDIA_KINDS.length) % MEDIA_KINDS.length];
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`mm-tab-${next}`)?.focus());
  }

  return (
    <div className="mm-tabs" role="tablist" aria-label="Tipo de archivo" onKeyDown={onKeyDown} data-tour="mm-tabs">
      {MEDIA_KINDS.map((kind) => {
        const Icon = KIND_ICONS[kind];
        const selected = kind === active;
        return (
          <button
            key={kind}
            id={`mm-tab-${kind}`}
            type="button"
            role="tab"
            className="mm-tab"
            aria-selected={selected}
            aria-controls="mm-results"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(kind)}
          >
            <Icon size={15} aria-hidden="true" />
            {KIND_LABELS[kind]}
            {counts && <span className="mm-count">{counts[kind]}</span>}
          </button>
        );
      })}
    </div>
  );
}
