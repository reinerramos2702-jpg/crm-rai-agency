'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { SLIDES_TARGET, stageLabel, type GridProgress, type StageState } from '@/lib/grid-progress';
import type { ThemeEntry } from '../types';

interface WeekProgressProps {
  themes: ThemeEntry[];
  progress: GridProgress;
  /** Día cuyo detalle se muestra a la derecha. */
  selected: number;
  /** Tema que el wizard está trabajando (Nodos 2-4). */
  active: number;
  onSelect: (index: number) => void;
}

const STAGES: Array<{ key: 'idea' | 'copy' | 'image'; label: string }> = [
  { key: 'idea', label: 'Idea' },
  { key: 'copy', label: 'Copy' },
  { key: 'image', label: 'Imagen' },
];

function Dot({ state, label }: { state: StageState; label: string }) {
  const cls = state === 'done' ? 'fx-dot--ok' : state === 'partial' ? 'fx-dot--warn' : '';
  return <span className={`fx-dot ${cls}`} role="img" aria-label={`${label}: ${stageLabel(state)}`} title={`${label}: ${stageLabel(state)}`} />;
}

/** Progreso total y vista de semana: un bloque por día con el estado de idea, copy e imagen. */
export function WeekProgress({ themes, progress, selected, active, onSelect }: WeekProgressProps) {
  return (
    <section className="gw-progress card" aria-label="Progreso de la semana" data-tour="gi-progress">
      <div className="row-between gw-progress-head">
        <div className="row" style={{ gap: 10 }}>
          <h2>Semana</h2>
          <span className="gw-percent">{progress.percent}%</span>
        </div>
        <p className="muted gw-progress-tally">
          <span><strong>{progress.readyCount}</strong>/{progress.pieces.length} listas</span>
          <span><strong>{progress.copyCount}</strong> con copy</span>
          <span><strong>{progress.imagesTotal}</strong> imágenes</span>
        </p>
      </div>

      <div
        className="progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-label="Avance total de la grilla"
      >
        <div className="progress-fill" style={{ width: `${Math.max(progress.percent, 2)}%` }} />
      </div>

      <ol className="gw-days">
        {progress.pieces.map((piece, i) => {
          const title = themes[i]?.title?.trim();
          return (
            <li key={i}>
              <button
                type="button"
                className={`gw-day${i === selected ? ' is-selected' : ''}${piece.ready ? ' is-ready' : ''}`}
                aria-pressed={i === selected}
                onClick={() => onSelect(i)}
              >
                <span className="gw-day-top">
                  <span className="gw-day-n">Día {i + 1}</span>
                  {piece.ready ? (
                    <span className="gw-day-ready"><Check size={12} aria-hidden="true" /> Lista</span>
                  ) : i === active ? (
                    <span className="gw-day-now">En curso</span>
                  ) : null}
                </span>
                <span className={`gw-day-title${title ? '' : ' is-empty'}`}>{title || 'Sin tema'}</span>
                <span className="gw-day-dots">
                  {STAGES.map(({ key, label }) => (
                    <Dot key={key} state={piece[key]} label={label} />
                  ))}
                  <span className="gw-day-imgs">{piece.imageCount}/{SLIDES_TARGET}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
