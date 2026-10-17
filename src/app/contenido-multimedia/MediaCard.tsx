'use client';

import React, { memo, useState } from 'react';
import { KIND_SINGULAR, ORIGIN_LABELS, type MediaItem } from '@/lib/media-types';
import { formatMediaDate } from '@/lib/media-actions';
import { KIND_ICONS } from './kind-icons';

interface MediaCardProps {
  item: MediaItem;
  selected: boolean;
  tags: readonly string[];
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}

/** Tarjeta de un activo: miniatura de proporción fija (carga diferida), selección y datos clave. */
export const MediaCard = memo(function MediaCard({ item, selected, tags, onToggle, onOpen }: MediaCardProps) {
  const [broken, setBroken] = useState(false);
  const Icon = KIND_ICONS[item.kind];
  const showImage = item.kind === 'image' && !!item.url && !broken;

  return (
    <article className={`mm-card${selected ? ' is-selected' : ''}`}>
      <label className="mm-check">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(item.id)}
          aria-label={`Seleccionar ${item.title}`}
        />
      </label>
      <button type="button" className="mm-thumb" onClick={() => onOpen(item.id)} aria-label={`Abrir ${item.title}`}>
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url as string}
            alt=""
            width={240}
            height={180}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="mm-thumb-icon">
            <Icon size={28} aria-hidden="true" />
            {item.ext ? item.ext : KIND_SINGULAR[item.kind]}
            {broken && <span>No se pudo cargar</span>}
          </span>
        )}
      </button>
      <div className="mm-body">
        <div className="mm-title" title={item.title}>{item.title}</div>
        <div className="mm-detail" title={item.detail}>{item.detail || <>&nbsp;</>}</div>
        <div className="mm-meta">
          <span className="mm-origin">{ORIGIN_LABELS[item.origin]}</span>
          <span>{formatMediaDate(item.date)}</span>
        </div>
        <div className="mm-tags">
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="mm-tag">{t}</span>
          ))}
          {tags.length > 3 && <span className="mm-tag">+{tags.length - 3}</span>}
        </div>
      </div>
    </article>
  );
});
