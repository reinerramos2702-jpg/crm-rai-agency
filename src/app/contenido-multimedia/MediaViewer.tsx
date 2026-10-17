'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Plus, Share2, X } from 'lucide-react';
import { formatMediaDate, stepIndex, suggestFileName, usageTargets, type UseInTarget } from '@/lib/media-actions';
import { KIND_SINGULAR, ORIGIN_LABELS, type MediaItem } from '@/lib/media-types';
import { copyText, downloadBrandText, downloadRemote } from './browser-actions';
import { KIND_ICONS } from './kind-icons';
import { useDialog } from './use-dialog';

interface MediaViewerProps {
  items: MediaItem[];
  index: number;
  tags: Readonly<Record<string, readonly string[]>>;
  onIndex: (index: number) => void;
  onClose: () => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

/** Visor a pantalla completa: ←/→ para navegar, Esc para cerrar, sin desenfoque de fondo. */
export function MediaViewer({ items, index, tags, onIndex, onClose, onAddTag, onRemoveTag }: MediaViewerProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [failed, setFailed] = useState<string | null>(null);

  const item = items[index];

  const handleClose = useCallback(() => {
    if (menuOpen) setMenuOpen(false);
    else onClose();
  }, [menuOpen, onClose]);
  useDialog(rootRef, handleClose);

  const go = useCallback(
    (delta: 1 | -1) => {
      setMenuOpen(false);
      onIndex(stepIndex(index, delta, items.length));
    },
    [index, items.length, onIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);

  if (!item) return null;

  const Icon = KIND_ICONS[item.kind];
  const itemTags = tags[item.id] ?? [];
  const targets = usageTargets(item);
  const isBrand = item.origin === 'brand';
  const external = /^https?:\/\//.test(item.sourceHref);

  async function download() {
    if (isBrand) {
      await downloadBrandText(item.title);
      return;
    }
    if (!item.url) return;
    const result = await downloadRemote(item.url, suggestFileName(item));
    if (result === 'opened') toast('Se abrió en otra pestaña: guárdalo desde allí.');
  }

  async function useIn(target: UseInTarget) {
    setMenuOpen(false);
    if (item.url) await copyText(item.url, `Enlace copiado. Pégalo en «${target.label}».`);
    onClose();
    router.push(target.href);
  }

  function submitTag(e: React.FormEvent) {
    e.preventDefault();
    if (!tagDraft.trim()) return;
    onAddTag(item.id, tagDraft);
    setTagDraft('');
  }

  return (
    <div className="mm-viewer" role="dialog" aria-modal="true" aria-label={`Visor: ${item.title}`} ref={rootRef} tabIndex={-1}>
      <div className="mm-viewer-head">
        <div className="mm-viewer-title">
          <h2>{item.title}</h2>
          <p>
            {KIND_SINGULAR[item.kind]} · {ORIGIN_LABELS[item.origin]}
            {item.detail ? ` · ${item.detail}` : ''} · {formatMediaDate(item.date)}
          </p>
        </div>
        <button type="button" className="btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar visor" data-autofocus>
          <X size={18} />
        </button>
      </div>

      <div className="mm-stage">
        {items.length > 1 && (
          <button type="button" className="mm-nav is-prev" onClick={() => go(-1)} aria-label="Anterior (flecha izquierda)">
            <ChevronLeft size={22} />
          </button>
        )}
        {item.kind === 'image' && item.url && failed !== item.id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.id} src={item.url} alt={item.title} referrerPolicy="no-referrer" onError={() => setFailed(item.id)} />
        ) : item.kind === 'video' && item.url ? (
          <video key={item.id} src={item.url} controls preload="metadata" playsInline />
        ) : item.kind === 'audio' && item.url ? (
          <audio key={item.id} src={item.url} controls preload="metadata" />
        ) : (
          <div className="mm-stage-doc">
            <Icon size={44} aria-hidden="true" />
            {isBrand ? (
              <p>
                El documento de marca se guarda como texto extraído del .docx. Puedes descargar ese texto o
                reemplazar el archivo desde el Generador de imágenes.
              </p>
            ) : failed === item.id ? (
              <p>No se pudo cargar la vista previa. Prueba a abrirla en otra pestaña o a descargarla.</p>
            ) : (
              <p>Este tipo de archivo no tiene vista previa. Ábrelo o descárgalo.</p>
            )}
          </div>
        )}
        {items.length > 1 && (
          <button type="button" className="mm-nav is-next" onClick={() => go(1)} aria-label="Siguiente (flecha derecha)">
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      <div className="mm-viewer-actions">
        {(item.url || isBrand) && (
          <button type="button" className="btn-secondary btn-sm" onClick={download}>
            <Download size={14} /> {isBrand ? 'Descargar texto' : 'Descargar'}
          </button>
        )}
        {item.url && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => copyText(item.url as string, 'Enlace copiado.')}>
            <Copy size={14} /> Copiar enlace
          </button>
        )}
        {targets.length > 0 && (
          <div className="mm-use">
            <button type="button" className="btn-secondary btn-sm" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen((v) => !v)}>
              <Share2 size={14} /> Usar en…
            </button>
            {menuOpen && (
              <div className="mm-use-menu" role="menu">
                {targets.map((t) => (
                  <button key={t.id} type="button" role="menuitem" className="mm-use-item" onClick={() => useIn(t)}>
                    <strong>{t.label}</strong>
                    <span>{t.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {external ? (
          <a className="btn btn-ghost btn-sm" href={item.sourceHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} /> Abrir enlace original
          </a>
        ) : (
          <Link className="btn btn-ghost btn-sm" href={item.sourceHref} onClick={onClose}>
            <ExternalLink size={14} /> Ir al origen
          </Link>
        )}
        <span className="mm-viewer-pos" aria-live="polite">
          {index + 1} de {items.length}
        </span>
      </div>

      <form className="mm-viewer-tags" onSubmit={submitTag}>
        {itemTags.map((t) => (
          <span key={t} className="mm-tag">
            {t}
            <button type="button" className="mm-tag-x" aria-label={`Quitar la etiqueta ${t}`} onClick={() => onRemoveTag(item.id, t)}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          className="input"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          placeholder="Añadir etiqueta"
          aria-label="Añadir etiqueta (solo en este navegador)"
          maxLength={24}
        />
        <button type="submit" className="btn-ghost btn-sm" disabled={!tagDraft.trim()}>
          <Plus size={14} /> Etiquetar
        </button>
      </form>
    </div>
  );
}
