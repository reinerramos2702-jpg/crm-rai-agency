'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FolderOpen, Images, Megaphone, Plus, RefreshCw, SearchX, Sparkles, CalendarClock } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchJson } from '@/lib/swr-cache';
import { useCachedJson } from '@/lib/use-cached-json';
import { MAX_BATCH_DOWNLOADS, PAGE_SIZE, buildCsv, linksText, suggestFileName } from '@/lib/media-actions';
import { mergeMedia } from '@/lib/media-build';
import {
  activeFilterCount,
  countByKind,
  countByOrigin,
  filterMedia,
  hasActiveFilters,
  type MediaView,
} from '@/lib/media-filter';
import { refToItem, tagCounts } from '@/lib/media-local';
import { KIND_LABELS, type MediaItem, type MediaResponse } from '@/lib/media-types';
import { AddDialog } from './AddDialog';
import { BatchBar } from './BatchBar';
import { MediaFilters } from './MediaFilters';
import { MediaGrid } from './MediaGrid';
import { MediaPageSkeleton } from './MediaSkeleton';
import { MediaTabs } from './MediaTabs';
import { MediaToolbar } from './MediaToolbar';
import { MediaViewer } from './MediaViewer';
import { copyText, downloadRemote, downloadText } from './browser-actions';
import { useMediaLocal } from './use-media-local';
import './media.css';
import './media-overlays.css';

const FLOW_STEPS = [
  { icon: Sparkles, title: 'Genera imágenes', text: 'Cada imagen que crees en una grilla del Generador aparece aquí.' },
  { icon: Megaphone, title: 'Lanza campañas', text: 'Los videos, voces e imágenes de tus campañas se reúnen aquí.' },
  { icon: CalendarClock, title: 'Programa publicaciones', text: 'Los medios de tus publicaciones programadas también se listan.' },
];

const TAB_HINTS = {
  image: 'Las imágenes salen del Generador, de las campañas y de las publicaciones programadas.',
  video: 'Los videos salen de las campañas que ya terminaron de procesarse.',
  audio: 'Las voces y la música salen de las campañas con audio generado.',
  document: 'Aquí aparece el documento de marca que subas, y los enlaces a documentos que añadas.',
} as const;

export default function ContenidoMultimediaPage() {
  const local = useMediaLocal();
  const { view, updateView } = local;
  const media = useCachedJson<MediaResponse>('/api/media', { ttlMs: 30_000 });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [busy, setBusy] = useState(false);

  const refItems = useMemo(() => local.refs.map(refToItem), [local.refs]);
  const items = useMemo<MediaItem[] | null>(() => {
    if (media.data) return mergeMedia([media.data.items, refItems]);
    if (media.error !== null) return refItems;
    return null;
  }, [media.data, media.error, refItems]);

  const ready = local.hydrated && items !== null;
  const tagMap = local.tags;

  const counts = useMemo(() => (items ? countByKind(items, view, tagMap) : null), [items, view, tagMap]);
  const originCounts = useMemo(
    () => countByOrigin(items ?? [], view, tagMap),
    [items, view, tagMap],
  );
  const visible = useMemo(() => (items ? filterMedia(items, view, tagMap) : []), [items, view, tagMap]);
  const tagList = useMemo(() => tagCounts(tagMap, new Set((items ?? []).map((i) => i.id))), [tagMap, items]);

  const filtering = hasActiveFilters(view);
  const viewSignature = `${view.tab}|${view.query}|${view.origin}|${view.range}|${view.sort}|${view.tag}`;
  useEffect(() => setLimit(PAGE_SIZE), [viewSignature]);

  const allSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));
  const selectedItems = useMemo(() => (items ?? []).filter((i) => selected.has(i.id)), [items, selected]);
  const viewerIndex = viewerId ? visible.findIndex((i) => i.id === viewerId) : -1;

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (visible.length > 0 && visible.every((i) => next.has(i.id))) visible.forEach((i) => next.delete(i.id));
      else visible.forEach((i) => next.add(i.id));
      return next;
    });
  }, [visible]);

  const clearFilters = useCallback(() => updateView({ query: '', origin: 'all', range: 'all', tag: '' }), [updateView]);
  const applySavedView = useCallback(
    (v: Omit<MediaView, 'tab'>) => {
      updateView(v);
      toast.success('Vista aplicada.');
    },
    [updateView],
  );

  async function refreshFresh() {
    try {
      const fresh = await fetchJson<MediaResponse>('/api/media?fresh=1');
      media.mutate(fresh);
    } catch {
      toast.error('No se pudo actualizar la biblioteca.');
    }
  }

  async function batchDownload() {
    const withFile = selectedItems.filter((i) => i.url);
    if (withFile.length === 0) {
      toast.error('Ninguno de los seleccionados tiene un archivo descargable.');
      return;
    }
    if (withFile.length > MAX_BATCH_DOWNLOADS) {
      toast.error(`Descarga hasta ${MAX_BATCH_DOWNLOADS} a la vez. Para el resto usa «Copiar enlaces» o la lista .csv.`);
      return;
    }
    setBusy(true);
    let opened = 0;
    for (const item of withFile) {
      const result = await downloadRemote(item.url as string, suggestFileName(item));
      if (result === 'opened') opened += 1;
      await new Promise((r) => setTimeout(r, 300));
    }
    setBusy(false);
    toast.success(opened > 0 ? `${withFile.length - opened} descargados; ${opened} se abrieron en otra pestaña.` : 'Descarga completa.');
  }

  function batchCopyLinks() {
    const text = linksText(selectedItems);
    if (!text) {
      toast.error('Ninguno de los seleccionados tiene enlace.');
      return;
    }
    void copyText(text, 'Enlaces copiados, uno por línea.');
  }

  function batchCsv() {
    downloadText(buildCsv(selectedItems), `biblioteca-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  }

  function batchTag(tag: string) {
    local.tagItems(selectedItems.map((i) => i.id), tag);
    toast.success(`Etiqueta añadida a ${selectedItems.length}.`);
  }

  function batchRemoveRefs() {
    const ids = new Set(selectedItems.filter((i) => i.origin === 'reference').map((i) => i.id));
    if (ids.size === 0) return;
    if (!window.confirm(`¿Quitar ${ids.size} enlace${ids.size === 1 ? '' : 's'}? Solo se borran de este navegador; los archivos originales no se tocan.`)) return;
    local.removeReferences(ids);
    setSelected((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    toast.success('Enlaces quitados.');
  }

  const removableCount = selectedItems.filter((i) => i.origin === 'reference').length;
  const total = items?.length ?? 0;
  const tabCount = counts?.[view.tab] ?? 0;
  const hasData = total > 0;

  return (
    <>
      <TopBar
        title="Contenido multimedia"
        subtitle="Todo lo que ya generaste y programaste, reunido en un solo lugar."
        actions={
          <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} />
            Añadir
          </button>
        }
      />

      {!ready ? (
        <MediaPageSkeleton />
      ) : (
        <div className="container">
          {media.error !== null && !media.data && (
            <div className="mm-note" role="alert" style={{ marginBottom: 16 }}>
              <RefreshCw size={16} aria-hidden="true" />
              <div>
                <p><strong>No se pudo cargar la biblioteca del servidor.</strong></p>
                <p>
                  {total > 0 ? 'Mientras tanto ves solo los enlaces guardados en este navegador. ' : ''}
                  <button type="button" className="btn-secondary btn-sm" onClick={() => void media.refresh()}>
                    Reintentar
                  </button>
                </p>
              </div>
            </div>
          )}

          {hasData && (
            <>
              <MediaTabs active={view.tab} counts={counts} onChange={(tab) => updateView({ tab })} />
              <MediaToolbar
                query={view.query}
                sort={view.sort}
                filtersOpen={filtersOpen}
                activeFilters={activeFilterCount(view)}
                visibleCount={visible.length}
                allSelected={allSelected}
                onQuery={(query) => updateView({ query })}
                onSort={(sort) => updateView({ sort })}
                onToggleFilters={() => setFiltersOpen((v) => !v)}
                onToggleSelectAll={toggleAll}
              />
              {filtersOpen && (
                <MediaFilters
                  view={view}
                  originCounts={originCounts}
                  tags={tagList}
                  savedViews={local.savedViews}
                  hasFilters={filtering}
                  onOrigin={(origin) => updateView({ origin })}
                  onRange={(range) => updateView({ range })}
                  onTag={(tag) => updateView({ tag })}
                  onClear={clearFilters}
                  onSaveView={(name) => {
                    local.saveView(name, view);
                    toast.success('Vista guardada en este navegador.');
                  }}
                  onApplyView={applySavedView}
                  onDeleteView={local.deleteView}
                />
              )}
            </>
          )}

          {!hasData ? (
            <EmptyState
              icon={FolderOpen}
              title="Tu biblioteca aún no tiene archivos"
              text="Se llena sola con lo que creas en el CRM. No necesitas subir nada: en cuanto generes, aparecerá aquí."
              steps={FLOW_STEPS}
              action={
                <div className="mm-form-actions" style={{ justifyContent: 'center' }}>
                  <Link href="/generador-imagenes" className="btn btn-primary">
                    <Images size={16} /> Ir al Generador
                  </Link>
                  <button type="button" className="btn-secondary" onClick={() => setAddOpen(true)}>
                    Añadir un enlace
                  </button>
                </div>
              }
            />
          ) : visible.length === 0 ? (
            filtering && tabCount === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Ningún activo coincide"
                text="Prueba con otra palabra, otro origen o un rango de fechas más amplio."
                action={
                  <button type="button" className="btn-secondary" onClick={clearFilters}>
                    Quitar filtros
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon={FolderOpen}
                title={`No hay ${KIND_LABELS[view.tab].toLowerCase()} todavía`}
                text={TAB_HINTS[view.tab]}
                action={
                  <button type="button" className="btn-secondary" onClick={() => setAddOpen(true)}>
                    Añadir un enlace
                  </button>
                }
              />
            )
          ) : (
            <MediaGrid
              items={visible}
              limit={limit}
              selected={selected}
              tags={tagMap}
              onToggle={toggle}
              onOpen={setViewerId}
              onMore={() => setLimit((n) => n + PAGE_SIZE)}
            />
          )}

          {selectedItems.length > 0 && (
            <BatchBar
              count={selectedItems.length}
              removableCount={removableCount}
              busy={busy}
              onClear={() => setSelected(new Set())}
              onCopyLinks={batchCopyLinks}
              onCsv={batchCsv}
              onDownload={() => void batchDownload()}
              onTag={batchTag}
              onRemoveRefs={batchRemoveRefs}
            />
          )}

          {hasData && (
            <div className="mm-foot muted">
              <span>
                {visible.length} de {total} activo{total === 1 ? '' : 's'}
                {media.data?.truncated ? ' · hay activos más antiguos sin listar' : ''}
              </span>
              <span>
                Espacio usado: no disponible. La biblioteca todavía no guarda el tamaño de los archivos.
              </span>
              <span>Enlaces, etiquetas y vistas guardadas viven solo en este navegador.</span>
            </div>
          )}
        </div>
      )}

      {viewerIndex >= 0 && (
        <MediaViewer
          items={visible}
          index={viewerIndex}
          tags={tagMap}
          onIndex={(i) => setViewerId(visible[i]?.id ?? null)}
          onClose={() => setViewerId(null)}
          onAddTag={(id, tag) => local.tagItems([id], tag)}
          onRemoveTag={local.untag}
        />
      )}

      {addOpen && (
        <AddDialog
          canUploadBrandDoc={media.data?.canUploadBrandDoc ?? false}
          onClose={() => setAddOpen(false)}
          onAddReference={local.addReference}
          onBrandDocUploaded={refreshFresh}
        />
      )}
    </>
  );
}
