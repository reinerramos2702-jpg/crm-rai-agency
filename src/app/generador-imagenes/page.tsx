'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Images, Plus, SearchX, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { TopBar } from '@/components/layout/TopBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useCachedJson } from '@/lib/use-cached-json';
import { fetchJson, invalidate, prefetchJson } from '@/lib/swr-cache';
import { countByStatus, filterGrids, gridsSignature, hasActiveFilters, pinnedFirst, sortGrids } from '@/lib/grid-filters';
import { buildTemplateThemes, templateById, type GridTemplate } from '@/lib/grid-templates';
import { BrandDocCard } from './BrandDocCard';
import { GridCard } from './GridCard';
import { GridFilters } from './GridFilters';
import { NewGridDialog } from './NewGridDialog';
import { EMPTY_BRAND_DOC, type BrandDocInfo, type ContentGridSummary } from './types';
import { getErrorMessage } from './utils';
import { useGridView } from './useGridView';
import { usePinnedGrids } from './usePinnedGrids';

/** Duración del pulso `is-syncing` de la cabecera (el anillo dura ~1,1 s). */
const SYNC_PULSE_MS = 1200;

const FLOW_STEPS = [
  { icon: FileText, title: '1 · Sube tu documento de marca', text: 'El .docx con reglas, narrativa y producción de tu agencia.' },
  { icon: Sparkles, title: '2 · Crea la grilla', text: '7 temas con carruseles; el asistente te guía nodo por nodo.' },
  { icon: Images, title: '3 · Genera y publica', text: 'Imágenes y copys listos para programar en tu calendario.' },
];

export default function GeneradorImagenesPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { view, setQuery, setStatus, setSort, clearFilters } = useGridView();
  const { pinned, toggle: togglePin } = usePinnedGrids();

  // Datos con caché compartida: al volver al módulo aparecen al instante y se
  // actualizan por detrás (ver src/lib/use-cached-json.ts).
  const gridsState = useCachedJson<{ grids?: ContentGridSummary[] }>('/api/content-grids', { ttlMs: 15_000 });
  const brandState = useCachedJson<BrandDocInfo>('/api/workspace/brand-doc', { ttlMs: 60_000 });
  const gridsData = gridsState.data;
  const gridsError = gridsState.error;
  const grids = useMemo<ContentGridSummary[] | null>(
    () => (gridsData !== undefined ? gridsData.grids ?? [] : gridsError !== null ? [] : null),
    [gridsData, gridsError],
  );
  const brandDoc: BrandDocInfo | null =
    brandState.data ?? (brandState.error !== null ? EMPTY_BRAND_DOC : null);

  // Conteos de los chips: con la búsqueda aplicada, para que coincidan con lo que se vería al pulsar.
  const counts = useMemo(
    () => countByStatus(filterGrids(grids ?? [], { query: view.query, status: 'all' })),
    [grids, view.query],
  );
  const visibleGrids = useMemo(
    () => (grids ? pinnedFirst(sortGrids(filterGrids(grids, view), view.sort), pinned) : null),
    [grids, view, pinned],
  );
  const filtering = hasActiveFilters(view);

  useEffect(() => {
    if (gridsError) toast.error('No se pudieron cargar las grillas', { id: 'grids-error' });
  }, [gridsError]);

  // Pulso de sincronización: cuando termina una revalidación (revalidating: true -> false) y la
  // lista (ids + updatedAt) difiere de la referencia, la cabecera pulsa una vez. La referencia
  // solo cambia con la red en reposo; la primera carga aún no la tiene (null): solo la fija.
  // Los cambios optimistas propios (eliminar) actualizan la referencia a mano.
  const baselineRef = useRef<string | null>(null);
  const revalidating = gridsState.revalidating;
  useEffect(() => {
    if (grids === null || revalidating) return;
    const signature = gridsSignature(grids);
    const previous = baselineRef.current;
    baselineRef.current = signature;
    if (previous !== null && previous !== signature) setSyncing(true);
  }, [grids, revalidating]);

  useEffect(() => {
    if (!syncing) return;
    const timer = setTimeout(() => setSyncing(false), SYNC_PULSE_MS);
    return () => clearTimeout(timer);
  }, [syncing]);

  async function handleCreate(templateId: GridTemplate['id'] | null) {
    setCreating(true);
    try {
      const template = templateId ? templateById(templateId) : undefined;
      const stamp = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short' });
      const res = await fetch('/api/content-grids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template ? { name: `${template.name} · ${stamp}` } : {}),
      });
      if (!res.ok) throw new Error('No se pudo crear la grilla');
      const data = await res.json();
      if (template) {
        // La plantilla ya define los 7 temas: la grilla arranca en el Nodo 2.
        const patch = await fetch(`/api/content-grids/${data.grid.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themes: buildTemplateThemes(template.id), currentStep: 2, status: 'in_progress' }),
        });
        if (!patch.ok) toast.error('La grilla se creó, pero no se pudieron precargar los temas');
      }
      invalidate('/api/content-grids');
      router.push(`/generador-imagenes/${data.grid.id}`);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error creando la grilla'));
      setCreating(false);
    }
  }

  async function handleDuplicate(grid: ContentGridSummary) {
    setDuplicatingId(grid.id);
    try {
      const source = await fetchJson<{ grid: { themes?: unknown[]; themesTotal?: number; imageProvider?: string; llmProvider?: string | null; llmModel?: string | null } }>(
        `/api/content-grids/${grid.id}`,
      );
      const themes = Array.isArray(source.grid.themes) ? source.grid.themes : [];
      const hasTitles = themes.some((t) => typeof (t as { title?: unknown })?.title === 'string' && (t as { title: string }).title.trim() !== '');
      const created = await fetch('/api/content-grids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${grid.name} (copia)`.slice(0, 120), imageProvider: source.grid.imageProvider }),
      });
      if (!created.ok) throw new Error('No se pudo duplicar la grilla');
      const { grid: copy } = await created.json();
      const patch = await fetch(`/api/content-grids/${copy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themes,
          ...(typeof source.grid.themesTotal === 'number' ? { themesTotal: source.grid.themesTotal } : {}),
          ...(source.grid.llmProvider ? { llmProvider: source.grid.llmProvider } : {}),
          ...(source.grid.llmModel ? { llmModel: source.grid.llmModel } : {}),
          currentStep: hasTitles ? 2 : 1,
          status: hasTitles ? 'in_progress' : 'draft',
        }),
      });
      if (!patch.ok) throw new Error('La copia se creó, pero no se pudo traer el contenido');
      await gridsState.refresh();
      toast.success('Grilla duplicada: se copiaron temas y copys (las imágenes no).');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error duplicando la grilla'));
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"? Esto borrará también las imágenes generadas. Esta acción no se puede deshacer.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/content-grids/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo eliminar la grilla');
      const remaining = (grids ?? []).filter((g) => g.id !== id);
      baselineRef.current = gridsSignature(remaining);
      gridsState.mutate({ grids: remaining });
      toast.success('Grilla eliminada');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error eliminando la grilla'));
    } finally {
      setDeletingId(null);
    }
  }

  async function uploadBrandDoc(file: File) {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Solo se aceptan archivos .docx');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/workspace/brand-doc', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error subiendo el documento');
      toast.success(`Documento de marca cargado: ${data.brandDocName}`);
      void brandState.refresh();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Error subiendo el documento'));
    } finally {
      setUploading(false);
    }
  }

  const total = grids?.length ?? 0;
  const shown = visibleGrids?.length ?? 0;

  return (
    <>
      <TopBar
        title="Generador Imágenes"
        subtitle="Crea grillas semanales de contenido guiadas paso a paso, desde la ideación hasta el copywriting final."
        actions={
          <button className="btn-primary" onClick={() => setDialogOpen(true)} disabled={creating}>
            <Plus size={16} />
            Nueva Grilla
          </button>
        }
      />

      <div className="container">
        <BrandDocCard brandDoc={brandDoc} uploading={uploading} onUpload={uploadBrandDoc} />

        {/* ===== Galería de grillas ===== */}
        <div className={`row-between gi-head fx-sync${syncing ? ' is-syncing' : ''}`}>
          <h2>Tus grillas</h2>
          {grids && (
            <span className="muted" aria-live="polite">
              {filtering ? `${shown} de ${total}` : total} grilla{total === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {grids !== null && total > 0 && (
          <GridFilters
            view={view}
            counts={counts}
            onQueryChange={setQuery}
            onStatusChange={setStatus}
            onSortChange={setSort}
          />
        )}

        {visibleGrids === null ? (
          <div className="grid grid-auto">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} lines={4} className="gi-skeleton" />
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={Images}
            title="Aún no tienes grillas"
            text="Una grilla es un proyecto semanal de contenido: 7 temas con sus carruseles, imágenes y copys. El asistente te guía nodo por nodo, validando cada paso contigo."
            steps={FLOW_STEPS}
            action={
              <button className="btn-primary" onClick={() => setDialogOpen(true)} disabled={creating}>
                <Sparkles size={16} />
                Crear primera grilla
              </button>
            }
          />
        ) : shown === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Ninguna grilla coincide"
            text="Prueba con otro nombre o cambia el estado seleccionado para volver a ver tus grillas."
            action={
              <button className="btn-secondary" onClick={clearFilters}>
                Limpiar filtros
              </button>
            }
          />
        ) : (
          <div className="grid grid-auto">
            {visibleGrids.map((grid) => (
              <GridCard
                key={grid.id}
                grid={grid}
                onOpen={() => router.push(`/generador-imagenes/${grid.id}`)}
                onDelete={() => handleDelete(grid.id, grid.name)}
                onDuplicate={() => handleDuplicate(grid)}
                onTogglePin={() => togglePin(grid.id)}
                onWarm={() => prefetchJson(`/api/content-grids/${grid.id}`, 8_000)}
                pinned={pinned.includes(grid.id)}
                deleting={deletingId === grid.id}
                duplicating={duplicatingId === grid.id}
              />
            ))}

            {/* Tarjeta "Nueva grilla" al final de la cuadrícula */}
            <button onClick={() => setDialogOpen(true)} disabled={creating} className="card gi-new">
              <Plus size={28} />
              <span className="gi-new-label">Nueva grilla</span>
            </button>
          </div>
        )}
      </div>

      <NewGridDialog
        open={dialogOpen}
        creating={creating}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
