'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CloudOff, FolderOpen, Plus, SearchX } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchJson } from '@/lib/swr-cache';
import { useCachedJson } from '@/lib/use-cached-json';
import { PAGE_SIZE } from '@/lib/media-actions';
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
import { KIND_LABELS, MEDIA_KINDS, type MediaItem, type MediaResponse } from '@/lib/media-types';
import { ActiveFilters } from './ActiveFilters';
import { AddDialog } from './AddDialog';
import { BatchBar } from './BatchBar';
import { ConfirmDialog } from './ConfirmDialog';
import { describeLoadError } from './error-copy';
import { MediaFilters } from './MediaFilters';
import { MediaFooter } from './MediaFooter';
import { MediaGrid } from './MediaGrid';
import { MediaPageSkeleton } from './MediaSkeleton';
import { MediaTabs } from './MediaTabs';
import { MediaToolbar } from './MediaToolbar';
import { MediaViewer } from './MediaViewer';
import { LibraryEmpty } from './LibraryEmpty';
import { LoadNotice, RetryButton } from './StatusPanels';
import { useBatchActions } from './use-batch-actions';
import { useMediaLocal } from './use-media-local';
import { useMediaSelection } from './use-media-selection';

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
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);
  // `failedOnce` mantiene la estructura visible mientras se reintenta una carga que ya falló.
  const [failedOnce, setFailedOnce] = useState(false);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    if (media.error !== null) {
      setFailedOnce(true);
      setRecovered(false);
    }
  }, [media.error]);
  useEffect(() => {
    if (media.data) setFailedOnce(false);
  }, [media.data]);

  const refItems = useMemo(() => local.refs.map(refToItem), [local.refs]);
  const items = useMemo<MediaItem[] | null>(() => {
    if (media.data) return mergeMedia([media.data.items, refItems]);
    if (media.error !== null || failedOnce) return refItems;
    return null;
  }, [media.data, media.error, failedOnce, refItems]);

  const ready = local.hydrated && items !== null;
  const tagMap = local.tags;

  const counts = useMemo(() => (items ? countByKind(items, view, tagMap) : null), [items, view, tagMap]);
  const originCounts = useMemo(() => countByOrigin(items ?? [], view, tagMap), [items, view, tagMap]);
  const visible = useMemo(() => (items ? filterMedia(items, view, tagMap) : []), [items, view, tagMap]);
  const tagList = useMemo(() => tagCounts(tagMap, new Set((items ?? []).map((i) => i.id))), [tagMap, items]);

  const filtering = hasActiveFilters(view);
  const viewSignature = `${view.tab}|${view.query}|${view.origin}|${view.range}|${view.sort}|${view.tag}`;
  useEffect(() => setLimit(PAGE_SIZE), [viewSignature]);

  const sel = useMediaSelection(visible);
  const allSelected = visible.length > 0 && visible.every((i) => sel.selected.has(i.id));
  const selectedItems = useMemo(() => (items ?? []).filter((i) => sel.selected.has(i.id)), [items, sel.selected]);
  const batch = useBatchActions(selectedItems, local.tagItems);
  const removableIds = useMemo(
    () => new Set(selectedItems.filter((i) => i.origin === 'reference').map((i) => i.id)),
    [selectedItems],
  );
  const viewerIndex = viewerId ? visible.findIndex((i) => i.id === viewerId) : -1;

  const onQuery = useCallback((query: string) => updateView({ query }), [updateView]);
  const clearFilters = useCallback(() => updateView({ query: '', origin: 'all', range: 'all', tag: '' }), [updateView]);
  const applySavedView = useCallback(
    (v: Omit<MediaView, 'tab'>) => {
      updateView(v);
      toast.success('Vista aplicada.');
    },
    [updateView],
  );

  async function refreshFresh() {
    setRefreshing(true);
    try {
      const fresh = await fetchJson<MediaResponse>('/api/media?fresh=1');
      media.mutate(fresh);
      setFailedOnce(false);
      setRecovered(true);
    } catch {
      toast.error('No se pudo actualizar la biblioteca.');
    } finally {
      setRefreshing(false);
    }
  }

  function confirmRemoveRefs() {
    local.removeReferences(removableIds);
    sel.removeMany(removableIds);
    setConfirmRemove(false);
    toast.success('Enlaces quitados.');
  }

  const total = items?.length ?? 0;
  const hasData = total > 0;
  const loadFailed = !media.data && (media.error !== null || failedOnce);
  const staleFailure = !!media.data && media.error !== null && !recovered;
  const showChrome = hasData || loadFailed;
  const errorCopy = describeLoadError(media.error);
  const tabCount = counts?.[view.tab] ?? 0;
  const elsewhere = counts ? MEDIA_KINDS.find((k) => k !== view.tab && counts[k] > 0) : undefined;

  function renderResults() {
    if (loadFailed && !hasData) {
      return (
        <EmptyState
          icon={CloudOff}
          title={errorCopy.title}
          text={`${errorCopy.text} Tu biblioteca no se ha perdido: solo no se pudo leer ahora.`}
          action={
            <div className="mm-form-actions mm-center">
              {errorCopy.retryable && <RetryButton retrying={media.revalidating} onRetry={() => void media.refresh()} />}
              <button type="button" className="btn-secondary btn-sm" onClick={() => setAddOpen(true)}>
                Añadir un enlace
              </button>
            </div>
          }
        />
      );
    }
    if (!hasData) return <LibraryEmpty onAddLink={() => setAddOpen(true)} />;
    if (visible.length === 0 && filtering && tabCount === 0) {
      return (
        <EmptyState
          icon={SearchX}
          title="Ningún activo coincide"
          text="Prueba con otra palabra, otro origen o un rango de fechas más amplio."
          action={
            <div className="mm-form-actions mm-center">
              <button type="button" className="btn-secondary" onClick={clearFilters}>
                Quitar filtros
              </button>
              {elsewhere && counts && (
                <button type="button" className="btn-ghost" onClick={() => updateView({ tab: elsewhere })}>
                  Ver {counts[elsewhere]} en {KIND_LABELS[elsewhere]}
                </button>
              )}
            </div>
          }
        />
      );
    }
    if (visible.length === 0) {
      return (
        <EmptyState
          icon={FolderOpen}
          title={`No hay ${KIND_LABELS[view.tab].toLowerCase()} todavía`}
          text={TAB_HINTS[view.tab]}
          action={
            <div className="mm-form-actions mm-center">
              <button type="button" className="btn-secondary" onClick={() => setAddOpen(true)}>
                Añadir un enlace
              </button>
              {elsewhere && counts && (
                <button type="button" className="btn-ghost" onClick={() => updateView({ tab: elsewhere })}>
                  Ver {KIND_LABELS[elsewhere].toLowerCase()} ({counts[elsewhere]})
                </button>
              )}
            </div>
          }
        />
      );
    }
    return (
      <MediaGrid
        items={visible}
        limit={limit}
        selected={sel.selected}
        tags={tagMap}
        onToggle={sel.toggle}
        onOpen={setViewerId}
        onMore={() => setLimit((n) => n + PAGE_SIZE)}
      />
    );
  }

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
          {(loadFailed && hasData) || staleFailure ? (
            <LoadNotice
              copy={errorCopy}
              meanwhile={
                staleFailure
                  ? 'Mientras tanto ves la última versión cargada.'
                  : 'Mientras tanto ves solo los enlaces guardados en este navegador.'
              }
              retrying={media.revalidating}
              onRetry={() => void media.refresh()}
            />
          ) : null}

          {showChrome && (
            <>
              <MediaTabs active={view.tab} counts={loadFailed ? null : counts} onChange={(tab) => updateView({ tab })} />
              <MediaToolbar
                query={view.query}
                sort={view.sort}
                filtersOpen={filtersOpen}
                activeFilters={activeFilterCount(view)}
                visibleCount={visible.length}
                allSelected={allSelected}
                refreshing={refreshing}
                onQuery={onQuery}
                onSort={(sort) => updateView({ sort })}
                onToggleFilters={() => setFiltersOpen((v) => !v)}
                onToggleSelectAll={sel.toggleAll}
                onRefresh={() => void refreshFresh()}
              />
              {filtersOpen ? (
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
              ) : (
                <ActiveFilters
                  view={view}
                  onOrigin={() => updateView({ origin: 'all' })}
                  onRange={() => updateView({ range: 'all' })}
                  onTag={() => updateView({ tag: '' })}
                  onClear={clearFilters}
                />
              )}
            </>
          )}

          {showChrome ? (
            <div id="mm-results" role="tabpanel" aria-labelledby={`mm-tab-${view.tab}`}>
              {renderResults()}
            </div>
          ) : (
            renderResults()
          )}

          {sel.selected.size > 0 && selectedItems.length > 0 && (
            <BatchBar
              count={selectedItems.length}
              removableCount={removableIds.size}
              busy={batch.busy}
              onClear={sel.clear}
              onCopyLinks={batch.copyLinks}
              onCsv={batch.csv}
              onDownload={() => void batch.download()}
              onTag={batch.tag}
              onRemoveRefs={() => setConfirmRemove(true)}
            />
          )}

          {hasData && <MediaFooter visible={visible.length} total={total} truncated={!!media.data?.truncated} />}
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

      {confirmRemove && removableIds.size > 0 && (
        <ConfirmDialog
          title={`¿Quitar ${removableIds.size} enlace${removableIds.size === 1 ? '' : 's'}?`}
          text="Solo se borran de este navegador. Los archivos originales no se tocan."
          confirmLabel="Quitar enlaces"
          onConfirm={confirmRemoveRefs}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </>
  );
}
