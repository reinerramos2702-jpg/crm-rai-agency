'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Copy, Download, ExternalLink, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { formatMediaDate, stepIndex, suggestFileName, usageTargets, type UseInTarget } from '@/lib/media-actions';
import { KIND_SINGULAR, ORIGIN_LABELS, type MediaItem } from '@/lib/media-types';
import { copyText, downloadBrandText, downloadRemote, isTypingTarget } from './browser-actions';
import { KIND_ICONS } from './kind-icons';
import { UseInMenu } from './UseInMenu';
import { useDialog } from './use-dialog';
import { ViewerStage } from './ViewerStage';
import { ViewerTags } from './ViewerTags';

interface MediaViewerProps {
  items: MediaItem[];
  index: number;
  tags: Readonly<Record<string, readonly string[]>>;
  onIndex: (index: number) => void;
  onClose: () => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
}

/** Descarga en segundo plano la imagen vecina para que al navegar aparezca al instante. */
function preload(item: MediaItem | undefined): void {
  if (!item || item.kind !== 'image' || !item.url) return;
  const img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.src = item.url;
}

/** Visor a pantalla completa: ←/→ navegan, Inicio/Fin saltan a los extremos, Esc cierra; sin desenfoque de fondo. */
export function MediaViewer({ items, index, tags, onIndex, onClose, onAddTag, onRemoveTag }: MediaViewerProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const item = items[index];
  useDialog(rootRef, onClose);

  const goTo = useCallback((target: number) => onIndex(target), [onIndex]);
  const go = useCallback((delta: 1 | -1) => goTo(stepIndex(index, delta, items.length)), [goTo, index, items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Home') goTo(0);
      else if (e.key === 'End') goTo(items.length - 1);
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, goTo, items.length]);

  useEffect(() => {
    preload(items[stepIndex(index, 1, items.length)]);
    preload(items[stepIndex(index, -1, items.length)]);
  }, [index, items]);

  if (!item) return null;

  const Icon = KIND_ICONS[item.kind];
  const url = item.url;
  const targets = usageTargets(item);
  const isBrand = item.origin === 'brand';
  const external = /^https?:\/\//.test(item.sourceHref);

  async function download() {
    setDownloading(true);
    try {
      if (isBrand) {
        await downloadBrandText(item.title);
      } else if (url) {
        const result = await downloadRemote(url, suggestFileName(item));
        if (result === 'opened') toast('Se abrió en otra pestaña: guárdalo desde allí.');
      }
    } finally {
      setDownloading(false);
    }
  }

  async function useIn(target: UseInTarget) {
    if (url) await copyText(url, `Enlace copiado. Pégalo en «${target.label}».`);
    onClose();
    router.push(target.href);
  }

  return (
    <div className="mm-viewer" role="dialog" aria-modal="true" aria-labelledby="mm-viewer-title" ref={rootRef} tabIndex={-1}>
      <header className="mm-viewer-head">
        <div className="mm-viewer-title">
          <div className="mm-viewer-chips">
            <span className="mm-vchip"><Icon size={12} aria-hidden="true" /> {KIND_SINGULAR[item.kind]}</span>
            <span className="mm-vchip">{ORIGIN_LABELS[item.origin]}</span>
            <span>{formatMediaDate(item.date)}</span>
          </div>
          <h2 id="mm-viewer-title">{item.title}</h2>
          {item.detail && <p>{item.detail}</p>}
        </div>
        <div className="mm-viewer-head-end">
          <span className="mm-viewer-pos" aria-live="polite">
            {index + 1} / {items.length}
          </span>
          <button type="button" className="btn-ghost btn-icon mm-viewer-close" onClick={onClose} aria-label="Cerrar visor (Esc)" data-autofocus>
            <X size={18} />
          </button>
        </div>
      </header>

      <ViewerStage key={item.id} item={item} hasNav={items.length > 1} onPrev={() => go(-1)} onNext={() => go(1)} />

      <div className="mm-viewer-actions">
        {(url || isBrand) && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => void download()} disabled={downloading}>
            {downloading ? <Spinner size="sm" /> : <Download size={14} />} {isBrand ? 'Descargar texto' : 'Descargar'}
          </button>
        )}
        {url && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => void copyText(url, 'Enlace copiado.')}>
            <Copy size={14} /> Copiar enlace
          </button>
        )}
        {targets.length > 0 && <UseInMenu key={item.id} targets={targets} onPick={(t) => void useIn(t)} />}
        {external ? (
          <a className="btn btn-ghost btn-sm" href={item.sourceHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} /> Abrir enlace original
          </a>
        ) : (
          <Link className="btn btn-ghost btn-sm" href={item.sourceHref} onClick={onClose}>
            <ExternalLink size={14} /> Ir al origen
          </Link>
        )}
        <span className="mm-viewer-hint" aria-hidden="true">
          <kbd>←</kbd> <kbd>→</kbd> navegar · <kbd>Esc</kbd> cerrar
        </span>
      </div>

      <ViewerTags itemId={item.id} tags={tags[item.id] ?? []} onAdd={onAddTag} onRemove={onRemoveTag} />
    </div>
  );
}
