'use client';

import React from 'react';
import { BookOpen, ExternalLink, RotateCcw } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { CheckRow } from './wizard-fields';

interface KB {
  id: string;
  name: string;
  description: string | null;
  _count?: { items: number; triggers: number };
}

const itemsText = (n: number) => `${n} ${n === 1 ? 'elemento' : 'elementos'}`;

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
}

/** Vincula bases de conocimiento existentes (FAQs, textos, URLs y archivos) al agente. */
export function KnowledgePicker({ selected, onChange }: Props) {
  const { data, error, loading, revalidating, refresh } = useCachedJson<{ knowledgeBases: KB[] }>('/api/knowledge-bases', { ttlMs: 30_000 });
  const bases = data?.knowledgeBases ?? [];
  const toggle = (id: string, on: boolean) => onChange(on ? [...selected, id] : selected.filter((x) => x !== id));

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <span className="label">Bases de conocimiento</span>
        <span className="row" style={{ gap: 8 }}>
          <button type="button" className="ag-btn ag-btn--ghost" style={{ minHeight: 32, padding: '0 10px' }} onClick={() => void refresh()} disabled={revalidating}>
            <RotateCcw size={13} aria-hidden="true" /> Actualizar
          </button>
          <a className="ag-btn ag-btn--ghost" style={{ minHeight: 32, padding: '0 10px' }} href="/agentes-ia/base-conocimiento" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={13} aria-hidden="true" /> Gestionar bases
          </a>
        </span>
      </div>

      {loading && (
        <div style={{ display: 'grid', gap: 10 }} aria-busy="true">
          <SkeletonLine height={48} /><SkeletonLine height={48} />
        </div>
      )}
      {!loading && error && !data && <p className="ag-hint" style={{ color: 'var(--rai-error)' }}>No se pudieron cargar las bases ({error}).</p>}
      {data && bases.length === 0 && (
        <div className="ag-section" style={{ textAlign: 'center' }}>
          <BookOpen size={24} className="muted" aria-hidden="true" />
          <p style={{ margin: '8px 0 4px', fontWeight: 600 }}>Aún no tienes bases de conocimiento</p>
          <p className="ag-hint">Crea una con tus FAQs, textos, URLs o archivos en «Gestionar bases» y pulsa «Actualizar». Tu avance se guarda solo.</p>
        </div>
      )}
      {bases.length > 0 && (
        <div className="ag-checks">
          {bases.map((kb) => (
            <CheckRow
              key={kb.id}
              checked={selected.includes(kb.id)}
              onChange={(on) => toggle(kb.id, on)}
              title={kb.name}
              text={`${itemsText(kb._count?.items ?? 0)}${kb.description ? ` · ${kb.description}` : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
