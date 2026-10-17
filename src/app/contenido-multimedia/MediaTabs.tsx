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
    const last = MEDIA_KINDS.length - 1;
    const i = MEDIA_KINDS.indexOf(active);
    let target = -1;
    if (e.key === 'ArrowRight') target = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowLeft') target = i === 0 ? last : i - 1;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = last;
    if (target < 0) return;
    e.preventDefault();
    const next = MEDIA_KINDS[target];
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
            <span className="mm-tab-label">{KIND_LABELS[kind]}</span>
            {counts && <span className="mm-count">{counts[kind]}</span>}
          </button>
        );
      })}
    </div>
  );
}
