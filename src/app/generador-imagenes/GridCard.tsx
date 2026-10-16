'use client';

import React from 'react';
import { ArrowRight, Image as ImageIcon, Images, Loader2, Trash2 } from 'lucide-react';
import { normalizeStatus, type GridStatus } from '@/lib/grid-filters';
import type { ContentGridSummary } from './types';
import { formatDate } from './utils';

const NODE_LABELS = [
  'Ideación semanal',
  'Arquitectura narrativa',
  'Generación de imágenes',
  'Ciclaje de temas',
  'Síntesis de copywriting',
];

const STATUS_INFO: Record<GridStatus, { label: string; badge: string; dot: string }> = {
  draft: { label: 'Sin iniciar', badge: 'badge-muted', dot: 'fx-dot--warn' },
  in_progress: { label: 'En progreso', badge: 'badge-gold', dot: 'fx-dot--live' },
  completed: { label: 'Completada', badge: 'badge-success', dot: 'fx-dot--ok' },
};

interface GridCardProps {
  grid: ContentGridSummary;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}

export function GridCard({ grid, onOpen, onDelete, deleting }: GridCardProps) {
  const statusInfo = STATUS_INFO[normalizeStatus(grid.status)];
  const progressPct = Math.round(((grid.currentStep - 1) / 5) * 100);
  const themeTitles = (grid.themes || []).filter((t) => t?.title).slice(0, 3);

  return (
    <div className="card gi-card fx-reveal fx-elev-1" onClick={onOpen}>
      <div className="row-between">
        <div className="row gi-card-head">
          <div className="gi-card-icon">
            <Images size={16} color="var(--rai-gold)" />
          </div>
          <h3 className="gi-card-title">{grid.name}</h3>
        </div>
        <div className="row fx-reveal-actions gi-card-actions">
          <button
            type="button"
            className="btn-secondary btn-sm"
            aria-label={`Abrir grilla ${grid.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            Abrir <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="btn-icon btn-danger btn-sm"
            title="Eliminar grilla"
            aria-label={`Eliminar grilla ${grid.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      <div className="row gi-card-status">
        <span className={`fx-dot ${statusInfo.dot}`} aria-hidden="true" />
        <span className={`badge ${statusInfo.badge}`}>{statusInfo.label}</span>
      </div>

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
        <ul className="gi-card-themes">
          {themeTitles.map((t, i) => (
            <li key={i} className="muted">· {t.title}</li>
          ))}
          {grid.themes.length > 3 && <li className="muted">+ {grid.themes.length - 3} más</li>}
        </ul>
      )}

      <div className="row-between muted gi-card-foot">
        <span className="row" style={{ gap: 4 }}>
          <ImageIcon size={12} /> {grid._count.assets} imagen{grid._count.assets === 1 ? '' : 'es'}
        </span>
        <span>Actualizado {formatDate(grid.updatedAt)}</span>
      </div>
    </div>
  );
}
