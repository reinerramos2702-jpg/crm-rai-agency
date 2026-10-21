'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { Check, Play } from 'lucide-react';
import { KIND_SINGULAR, ORIGIN_LABELS, type MediaItem } from '@/lib/media-types';
import { formatMediaDate } from '@/lib/media-actions';
import { KIND_ICONS } from './kind-icons';

interface MediaCardProps {
  item: MediaItem;
  selected: boolean;
  tags: readonly string[];
  /** `range` es true con Mayús: marca todo el tramo desde el último activo tocado. */
  onToggle: (id: string, range?: boolean) => void;
  onOpen: (id: string) => void;
}

const MAX_TAGS = 2;

/** Tarjeta de un activo: miniatura de proporción fija (carga diferida con fundido), tipo, selección y datos clave. */
export const MediaCard = memo(function MediaCard({ item, selected, tags, onToggle, onOpen }: MediaCardProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const Icon = KIND_ICONS[item.kind];
  const src = item.kind === 'image' && !broken ? item.url : null;

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <article className={`mm-card${selected ? ' is-selected' : ''}`}>
      <div className="mm-media">
        <button
          type="button"
          className={`mm-thumb${src && !loaded ? ' fx-shimmer' : ''}`}
          onClick={() => onOpen(item.id)}
          aria-label={`Abrir ${item.title}`}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              width={240}
              height={180}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className={loaded ? undefined : 'is-pending'}
              onLoad={() => setLoaded(true)}
              onError={() => setBroken(true)}
            />
          ) : (
            <span className="mm-thumb-icon">
              <Icon size={28} aria-hidden="true" />
              <span>{item.ext ? item.ext : KIND_SINGULAR[item.kind]}</span>
              {broken && <span className="mm-thumb-note">No se pudo cargar</span>}
            </span>
          )}
          {item.kind === 'video' && (
            <span className="mm-play" aria-hidden="true">
              <span><Play size={16} /></span>
            </span>
          )}
        </button>
        <span className="mm-kind" aria-hidden="true">
          <Icon size={12} /> {KIND_SINGULAR[item.kind]}
        </span>
        <label className="mm-check">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggle(item.id, e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey)}
            aria-label={`Seleccionar ${item.title}`}
          />
          <span className="mm-check-box" aria-hidden="true">
            <Check size={14} strokeWidth={3} />
          </span>
        </label>
      </div>
      <div className="mm-body">
        <div className="mm-title" title={item.title}>{item.title}</div>
        <div className="mm-detail" title={item.detail}>{item.detail}</div>
        <div className="mm-meta">
          <span className="mm-origin">{ORIGIN_LABELS[item.origin]}</span>
          <span className="mm-date">{formatMediaDate(item.date)}</span>
        </div>
        <div className="mm-tags">
          {tags.slice(0, MAX_TAGS).map((t) => (
            <span key={t} className="mm-tag">{t}</span>
          ))}
          {tags.length > MAX_TAGS && <span className="mm-tag">+{tags.length - MAX_TAGS}</span>}
        </div>
      </div>
    </article>
  );
});
