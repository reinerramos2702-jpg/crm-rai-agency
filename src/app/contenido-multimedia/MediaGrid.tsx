'use client';

import React from 'react';
import { PAGE_SIZE } from '@/lib/media-actions';
import type { MediaItem } from '@/lib/media-types';
import { MediaCard } from './MediaCard';

interface MediaGridProps {
  items: MediaItem[];
  limit: number;
  selected: ReadonlySet<string>;
  tags: Readonly<Record<string, readonly string[]>>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onMore: () => void;
}

const NO_TAGS: readonly string[] = [];

/** Cuadrícula paginada: pinta de a 48 para mantener la página ligera con bibliotecas grandes. */
export function MediaGrid({ items, limit, selected, tags, onToggle, onOpen, onMore }: MediaGridProps) {
  const shown = items.slice(0, limit);
  const remaining = items.length - shown.length;
  return (
    <div id="mm-results" role="tabpanel">
      <div className="mm-grid">
        {shown.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            selected={selected.has(item.id)}
            tags={tags[item.id] ?? NO_TAGS}
            onToggle={onToggle}
            onOpen={onOpen}
          />
        ))}
      </div>
      {remaining > 0 && (
        <div className="mm-more">
          <button type="button" className="btn-secondary" onClick={onMore}>
            Mostrar {Math.min(PAGE_SIZE, remaining)} más ({remaining} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
