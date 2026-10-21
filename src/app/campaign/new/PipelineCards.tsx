'use client';

import { useId, useRef, type KeyboardEvent } from 'react';
import { GalleryHorizontal, Image as ImageIcon, Newspaper, Video, type LucideIcon } from 'lucide-react';
import { PIPELINE_TYPES, pipelineHasVideo } from '@/lib/campaign-new-options';

const ICONS: Record<string, LucideIcon> = {
  ugc: Video,
  avatar_reel: Newspaper,
  static_ads: ImageIcon,
  carousel: GalleryHorizontal,
};

interface PipelineCardsProps {
  value: string;
  onChange: (value: string) => void;
  /** Id del elemento que rotula al grupo (el título «Tipo de Pipeline»). */
  labelledBy: string;
}

/** Selector de pipeline como grupo de radios: flechas para moverse, Espacio/Enter para elegir. */
export function PipelineCards({ value, onChange, labelledBy }: PipelineCardsProps) {
  const uid = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(0, PIPELINE_TYPES.findIndex((p) => p.value === value));

  function move(to: number) {
    const count = PIPELINE_TYPES.length;
    const next = (to + count) % count;
    onChange(PIPELINE_TYPES[next].value);
    refs.current[next]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        move(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        move(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        move(0);
        break;
      case 'End':
        e.preventDefault();
        move(PIPELINE_TYPES.length - 1);
        break;
    }
  }

  return (
    <div className="cn-pc-group" role="radiogroup" aria-labelledby={labelledBy}>
      {PIPELINE_TYPES.map((p, i) => {
        const Icon = ICONS[p.value] ?? Video;
        const checked = p.value === value;
        const nameId = `${uid}-${p.value}-name`;
        const descId = `${uid}-${p.value}-desc`;
        return (
          <button
            key={p.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-labelledby={nameId}
            aria-describedby={descId}
            tabIndex={i === activeIndex ? 0 : -1}
            className="cn-pc"
            onClick={() => onChange(p.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span className="cn-pc-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className="cn-pc-body">
              <span className="cn-pc-name" id={nameId}>{p.name}</span>
              <span className="cn-pc-desc" id={descId}>
                {p.description}
                <span className="cn-pc-meta">{pipelineHasVideo(p.value) ? 'Con video y voz' : 'Solo imágenes'}</span>
              </span>
            </span>
            <span className="cn-pc-check" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="12" height="12" focusable="false">
                <path d="M3 8.5l3.2 3.2L13 4.8" />
              </svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}
