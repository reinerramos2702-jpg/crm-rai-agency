'use client';

import React from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import type { SyncStatus } from '../../useContentPlannerSync';
import type { ConfigProgress } from '../utils';

interface SyncPillProps {
  status: SyncStatus;
  label: string;
}

/** Indicador de guardado: punto de estado + texto. El anuncio es cortés (no interrumpe). */
export function SyncState({ status, label }: SyncPillProps) {
  const dot = status === 'error' ? 'fx-dot--danger' : status === 'saving' || status === 'loading' ? 'fx-dot--warn' : 'fx-dot--ok';
  return (
    <span className={`ig-sync${status === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
      <span className={`fx-dot ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

interface ConfigHeaderProps {
  progress: ConfigProgress;
  syncStatus: SyncStatus;
  syncLabel: string;
}

export function ConfigHeader({ progress, syncStatus, syncLabel }: ConfigHeaderProps) {
  const { pct, done, required } = progress;
  return (
    <div className="rai-cfg-head card">
      <div className="rai-cfg-head-main">
        <div className="rai-eyebrow">Contenido · Instagram</div>
        <h2 className="rai-cfg-head-title">Configuración de contenido</h2>
        <p className="ig-head-sub">Lo que defines aquí alimenta a la IA y a la publicación diaria. Se guarda solo.</p>
        <div className="rai-cfg-count">{done} de {required.length} secciones esenciales listas</div>
      </div>
      <div className="rai-cfg-head-side">
        <div
          className="rai-ring"
          data-tour="cfg-progress"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avance de configuración"
          data-level={pct >= 100 ? 'done' : pct >= 50 ? 'mid' : 'low'}
          style={{ '--p': pct } as React.CSSProperties}
        >
          <svg className="rai-ring-svg" viewBox="0 0 36 36" aria-hidden="true">
            <circle className="rai-ring-track" cx="18" cy="18" r="15.9155" pathLength={100} />
            <circle className="rai-ring-bar" cx="18" cy="18" r="15.9155" pathLength={100} />
          </svg>
          <span>{pct}%</span>
        </div>
        <SyncState status={syncStatus} label={syncLabel} />
      </div>
    </div>
  );
}

interface ConfigNavProps {
  progress: ConfigProgress;
  activeSection: string;
  onGo: (id: string) => void;
}

export function ConfigNav({ progress, activeSection, onGo }: ConfigNavProps) {
  return (
    <nav className="rai-cfg-nav" aria-label="Secciones de configuración" data-tour="cfg-nav">
      {progress.sections.map((x) => (
        <button
          key={x.id}
          type="button"
          className={`rai-cfg-link ${x.done ? 'is-done' : ''} ${activeSection === x.id ? 'is-active' : ''}`}
          aria-current={activeSection === x.id ? 'true' : undefined}
          onClick={() => onGo(x.id)}
        >
          <span className="rai-cfg-check" aria-hidden="true">{x.done ? <Check size={12} /> : null}</span>
          <span className="rai-cfg-link-text">
            <strong>{x.label}</strong>
            <small>{x.done ? 'Listo' : x.hint}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}

interface SaveBarProps {
  syncStatus: SyncStatus;
  syncLabel: string;
  onSave: () => void;
}

export function SaveBar({ syncStatus, syncLabel, onSave }: SaveBarProps) {
  return (
    <div className="rai-savebar" data-tour="savebar">
      <SyncState status={syncStatus} label={syncLabel} />
      <button type="button" className="rai-savebar-btn" onClick={onSave}>
        <Sparkles size={16} aria-hidden="true" /> Guardar y planear contenido <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
