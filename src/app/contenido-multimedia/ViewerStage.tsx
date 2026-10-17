'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import type { MediaItem } from '@/lib/media-types';
import { KIND_ICONS } from './kind-icons';

interface ViewerStageProps {
  item: MediaItem;
  hasNav: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const SWIPE_MIN_PX = 56;

/**
 * Escenario del visor: imagen con esqueleto mientras carga, video y audio nativos, o un mensaje claro
 * cuando no hay vista previa. Se monta con `key={item.id}`: cada activo empieza limpio.
 */
export function ViewerStage({ item, hasNav, onPrev, onNext }: ViewerStageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(item.kind === 'image' && item.url ? 'loading' : 'ready');
  const [attempt, setAttempt] = useState(0);
  const Icon = KIND_ICONS[item.kind];
  const isBrand = item.origin === 'brand';
  const playable = !!item.url && state !== 'failed';

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setState('ready');
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    const t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t || !hasNav) return;
    if (e.target instanceof Element && e.target.closest('video, audio')) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) onNext();
    else onPrev();
  }

  function retry() {
    setState(item.kind === 'image' ? 'loading' : 'ready');
    setAttempt((n) => n + 1);
  }

  return (
    <div className="mm-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {hasNav && (
        <button type="button" className="mm-nav is-prev" onClick={onPrev} aria-label="Anterior (flecha izquierda)">
          <ChevronLeft size={22} />
        </button>
      )}
      <div className="mm-stage-media">
        {playable && item.kind === 'image' && (
          <>
            {state === 'loading' && (
              <>
                <span className="mm-stage-skel fx-shimmer" aria-hidden="true" />
                <span className="fx-sr-only" role="status">Cargando imagen…</span>
              </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={attempt}
              ref={imgRef}
              src={item.url ?? undefined}
              alt={item.title}
              referrerPolicy="no-referrer"
              className={state === 'loading' ? 'is-pending' : undefined}
              onLoad={() => setState('ready')}
              onError={() => setState('failed')}
            />
          </>
        )}
        {playable && item.kind === 'video' && (
          <video key={attempt} src={item.url ?? undefined} controls preload="metadata" playsInline onError={() => setState('failed')} />
        )}
        {playable && item.kind === 'audio' && (
          <div className="mm-stage-audio">
            <Icon size={44} aria-hidden="true" />
            <audio key={attempt} src={item.url ?? undefined} controls preload="metadata" onError={() => setState('failed')} />
          </div>
        )}
        {(!playable || item.kind === 'document') && (
          <div className="mm-stage-doc">
            <Icon size={44} aria-hidden="true" />
            {isBrand ? (
              <p>
                El documento de marca se guarda como texto extraído del .docx. Puedes descargar ese texto o
                reemplazar el archivo desde el Generador de imágenes.
              </p>
            ) : state === 'failed' ? (
              <>
                <p>No se pudo cargar la vista previa. Prueba a abrirla en otra pestaña, a descargarla o a reintentar.</p>
                <button type="button" className="btn-secondary btn-sm" onClick={retry}>
                  <RefreshCw size={14} /> Reintentar
                </button>
              </>
            ) : (
              <p>Este tipo de archivo no tiene vista previa. Ábrelo o descárgalo.</p>
            )}
          </div>
        )}
      </div>
      {hasNav && (
        <button type="button" className="mm-nav is-next" onClick={onNext} aria-label="Siguiente (flecha derecha)">
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}
