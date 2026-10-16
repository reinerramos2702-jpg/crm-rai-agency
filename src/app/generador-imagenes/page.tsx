'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Images,
  Plus,
  Trash2,
  FileText,
  Upload,
  CheckCircle2,
  Loader2,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { useCachedJson } from '@/lib/use-cached-json';

interface ThemeSummary {
  title?: string;
  category?: string;
}

interface ContentGridSummary {
  id: string;
  name: string;
  status: string;
  currentStep: number;
  activeThemeIndex: number;
  themesTotal: number;
  imageProvider: string;
  themes: ThemeSummary[];
  createdAt: string;
  updatedAt: string;
  _count: { assets: number };
}

interface BrandDocInfo {
  brandDocName: string | null;
  brandDocText: string | null;
  brandDocUpdatedAt: string | null;
  hasBrandDoc: boolean;
}

const NODE_LABELS = [
  'Ideación semanal',
  'Arquitectura narrativa',
  'Generación de imágenes',
  'Ciclaje de temas',
  'Síntesis de copywriting',
];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Sin iniciar', cls: 'badge-muted' },
  in_progress: { label: 'En progreso', cls: 'badge-gold' },
  completed: { label: 'Completada', cls: 'badge-success' },
};

const EMPTY_BRAND_DOC: BrandDocInfo = {
  brandDocName: null,
  brandDocText: null,
  brandDocUpdatedAt: null,
  hasBrandDoc: false,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function GeneradorImagenesPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Datos con caché compartida: al volver al módulo aparecen al instante y se
  // actualizan por detrás (ver src/lib/use-cached-json.ts).
  const gridsState = useCachedJson<{ grids?: ContentGridSummary[] }>('/api/content-grids', { ttlMs: 15_000 });
  const brandState = useCachedJson<BrandDocInfo>('/api/workspace/brand-doc', { ttlMs: 60_000 });
  const grids: ContentGridSummary[] | null =
    gridsState.data !== undefined ? gridsState.data.grids ?? [] : gridsState.error !== null ? [] : null;
  const brandDoc: BrandDocInfo | null =
    brandState.data ?? (brandState.error !== null ? EMPTY_BRAND_DOC : null);

  useEffect(() => {
    if (gridsState.error) toast.error('No se pudieron cargar las grillas', { id: 'grids-error' });
  }, [gridsState.error]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/content-grids', { method: 'POST' });
      if (!res.ok) throw new Error('No se pudo crear la grilla');
      const data = await res.json();
      router.push(`/generador-imagenes/${data.grid.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Error creando la grilla');
      setCreating(false);
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
      gridsState.mutate({ grids: (grids ?? []).filter((g) => g.id !== id) });
      toast.success('Grilla eliminada');
    } catch (e: any) {
      toast.error(e.message || 'Error eliminando la grilla');
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
    } catch (e: any) {
      toast.error(e.message || 'Error subiendo el documento');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadBrandDoc(file);
  }

  return (
    <>
      <TopBar
        title="Generador Imágenes"
        subtitle="Crea grillas semanales de contenido guiadas paso a paso, desde la ideación hasta el copywriting final."
        actions={
          <button className="btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? <Spinner size="sm" /> : <Plus size={16} />}
            Nueva Grilla
          </button>
        }
      />

      <div className="container">
        {/* ===== Doc de marca (Sistema Operativo de Contenido) ===== */}
        <div
          className={`card gi-brand${dragOver ? ' is-over' : ''}`}
          data-tour="gi-brand"
          style={{ marginBottom: 28 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 16 }}>
            <div className="row" style={{ gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(201,168,76,0.1)',
                  border: '1px solid rgba(201,168,76,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileText size={20} color="var(--rai-gold)" />
              </div>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <h3>Sistema Operativo de Contenido</h3>
                  {brandDoc?.hasBrandDoc ? (
                    <span className="badge badge-success">
                      <CheckCircle2 size={11} /> Cargado
                    </span>
                  ) : (
                    <span className="badge badge-muted">Sin documento</span>
                  )}
                </div>
                {brandDoc?.hasBrandDoc ? (
                  <p className="muted" style={{ marginTop: 4 }}>
                    {brandDoc.brandDocName}
                    {brandDoc.brandDocUpdatedAt && ` · actualizado ${formatDate(brandDoc.brandDocUpdatedAt)}`}
                    {' · '}
                    {brandDoc.brandDocText?.length.toLocaleString('es')} caracteres
                  </p>
                ) : (
                  <p className="muted" style={{ marginTop: 4 }}>
                    Arrastra aquí el documento .docx con las reglas de marca, narrativa y producción
                    de tu agencia. El asistente lo usará como guion para cada nodo del wizard.
                  </p>
                )}
              </div>
            </div>

            <div className="row" style={{ gap: 8 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadBrandDoc(file);
                  e.target.value = '';
                }}
              />
              <button
                className="btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Spinner size="sm" /> : <Upload size={14} />}
                {brandDoc?.hasBrandDoc ? 'Reemplazar' : 'Subir .docx'}
              </button>
            </div>
          </div>
        </div>

        {/* ===== Galería de grillas ===== */}
        <div className="row-between" style={{ marginBottom: 16 }}>
          <h2>Tus grillas</h2>
          {grids && <span className="muted">{grids.length} grilla{grids.length === 1 ? '' : 's'}</span>}
        </div>

        {grids === null ? (
          <div className="grid grid-auto" aria-busy="true" aria-label="Cargando grillas">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card gi-skel" aria-hidden="true">
                <span className="gi-skel-line w40" />
                <span className="gi-skel-line w25" />
                <span className="gi-skel-line w100" />
                <span className="gi-skel-line w70" />
              </div>
            ))}
          </div>
        ) : grids.length === 0 ? (
          <EmptyState onCreate={handleCreate} creating={creating} />
        ) : (
          <div className="grid grid-auto">
            {grids.map((grid) => (
              <GridCard
                key={grid.id}
                grid={grid}
                onOpen={() => router.push(`/generador-imagenes/${grid.id}`)}
                onDelete={() => handleDelete(grid.id, grid.name)}
                deleting={deletingId === grid.id}
              />
            ))}

            {/* Tarjeta "Nueva grilla" al final de la cuadrícula */}
            <button
              onClick={handleCreate}
              disabled={creating}
              className="card gi-new"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                minHeight: 200,
                border: '1px dashed var(--rai-border)',
                background: 'transparent',
                color: 'var(--rai-muted)',
                boxShadow: 'none',
              }}
            >
              {creating ? <Spinner size="md" /> : <Plus size={28} />}
              <span style={{ fontWeight: 600, textTransform: 'none', fontSize: 14 }}>Nueva grilla</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const FLOW_STEPS = [
  { icon: FileText, title: '1 · Sube tu documento de marca', text: 'El .docx con reglas, narrativa y producción de tu agencia.' },
  { icon: Sparkles, title: '2 · Crea la grilla', text: '7 temas con carruseles; el asistente te guía nodo por nodo.' },
  { icon: Images, title: '3 · Genera y publica', text: 'Imágenes y copys listos para programar en tu calendario.' },
];

function EmptyState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div className="card gi-empty">
      <div className="gi-empty-icon">
        <Images size={28} color="var(--rai-gold)" />
      </div>
      <h2 style={{ marginBottom: 8 }}>Aún no tienes grillas</h2>
      <p className="muted" style={{ maxWidth: 440, margin: '0 auto 20px' }}>
        Una grilla es un proyecto semanal de contenido: 7 temas con sus carruseles, imágenes
        y copys. El asistente te guía nodo por nodo, validando cada paso contigo.
      </p>
      <ol className="gi-flow">
        {FLOW_STEPS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="gi-flow-step">
            <span className="gi-flow-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <strong>{title}</strong>
            <span className="muted">{text}</span>
          </li>
        ))}
      </ol>
      <button className="btn-primary" onClick={onCreate} disabled={creating}>
        {creating ? <Spinner size="sm" /> : <Sparkles size={16} />}
        Crear primera grilla
      </button>
    </div>
  );
}

function GridCard({
  grid,
  onOpen,
  onDelete,
  deleting,
}: {
  grid: ContentGridSummary;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const statusInfo = STATUS_LABEL[grid.status] || STATUS_LABEL.draft;
  const progressPct = Math.round(((grid.currentStep - 1) / 5) * 100);
  const themeTitles = (grid.themes || []).filter((t) => t?.title).slice(0, 3);

  return (
    <div className="card gi-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }} onClick={onOpen}>
      <div className="row-between">
        <div className="row" style={{ gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Images size={16} color="var(--rai-gold)" />
          </div>
          <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{grid.name}</h3>
        </div>
        <button
          className="btn-icon btn-danger btn-sm"
          title="Eliminar grilla"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={deleting}
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      <span className={`badge ${statusInfo.cls}`} style={{ alignSelf: 'flex-start' }}>
        {statusInfo.label}
      </span>

      <div>
        <div className="row-between" style={{ marginBottom: 6 }}>
          <span className="label">Nodo {grid.currentStep}/5</span>
          <span className="muted" style={{ fontSize: 12 }}>{NODE_LABELS[grid.currentStep - 1]}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.max(progressPct, 4)}%` }} />
        </div>
      </div>

      {themeTitles.length > 0 && (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {themeTitles.map((t, i) => (
            <li key={i} className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              · {t.title}
            </li>
          ))}
          {grid.themes.length > 3 && (
            <li className="muted" style={{ fontSize: 12 }}>+ {grid.themes.length - 3} más</li>
          )}
        </ul>
      )}

      <div className="row-between muted" style={{ fontSize: 12, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--rai-border)' }}>
        <span className="row" style={{ gap: 4 }}>
          <ImageIcon size={12} /> {grid._count.assets} imagen{grid._count.assets === 1 ? '' : 'es'}
        </span>
        <span>Actualizado {formatDate(grid.updatedAt)}</span>
      </div>
    </div>
  );
}
