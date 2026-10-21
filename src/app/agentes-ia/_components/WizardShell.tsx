'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { formatDraftAge, type StoredDraft } from '@/lib/draft-storage';
import { hasBlocking, progressPercent, type StepIssue, type WizardStep } from '@/lib/agent-wizard';
import { IssueList } from './wizard-fields';

interface Props {
  variant: 'chat' | 'voice';
  title: string;
  steps: readonly WizardStep[];
  step: number;
  onStep: (index: number) => void;
  issues: readonly StepIssue[];
  recovered: StoredDraft<unknown> | null;
  onRestore: () => void;
  onDiscard: () => void;
  savedAt: number | null;
  aside: React.ReactNode;
  children: React.ReactNode;
}

/** Marco común de los dos asistentes: progreso, pasos, borrador recuperable y navegación. */
export function WizardShell({ variant, title, steps, step, onStep, issues, recovered, onRestore, onDiscard, savedAt, aside, children }: Props) {
  const [maxReached, setMaxReached] = useState(0);
  const current = steps[step];
  const last = step === steps.length - 1;
  const blocked = hasBlocking(issues);
  const reach = Math.max(maxReached, step);

  const go = (i: number) => {
    setMaxReached((m) => Math.max(m, i));
    onStep(i);
  };

  return (
    <div className={`container ag-wiz ag-wiz--${variant}`}>
      <Link href="/agentes-ia" className="muted ag-wiz-back"><ArrowLeft size={14} aria-hidden="true" /> Agentes de IA</Link>
      <h1 className="h1">{title}</h1>

      <div
        className="ag-progress"
        role="progressbar"
        aria-label="Progreso del asistente"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent(step, steps.length)}
        aria-valuetext={`Paso ${step + 1} de ${steps.length}: ${current.label}`}
      >
        <div className="ag-progress-bar" style={{ ['--p' as string]: progressPercent(step, steps.length) / 100 }} />
      </div>

      <ol className="ag-steps">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className="ag-step"
              aria-current={i === step ? 'step' : undefined}
              data-done={i < step}
              disabled={i > reach}
              onClick={() => go(i)}
            >
              <span className="ag-step-num">{i < step ? <Check size={12} aria-hidden="true" /> : i + 1}</span>
              <span className="ag-step-label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      {recovered && (
        <div className="ag-banner" role="alert">
          <span>Tienes un borrador guardado hace {formatDraftAge(recovered.savedAt)}.</span>
          <span className="row" style={{ gap: 8 }}>
            <button type="button" className="ag-btn ag-btn--accent" onClick={onRestore}>Restaurar</button>
            <button type="button" className="ag-btn ag-btn--ghost" onClick={onDiscard}>Descartar</button>
          </span>
        </div>
      )}

      <div className="ag-wiz-grid">
        <div className="card">
          <h2 className="ag-wiz-title">{current.label}</h2>
          <p className="muted" style={{ marginBottom: 16 }}>{current.hint}</p>
          {children}
          <IssueList issues={issues} />
          <div className="ag-wiz-foot">
            <span className="ag-saved" aria-live="polite">{savedAt ? 'Borrador guardado automáticamente' : 'Tu avance se guarda solo'}</span>
            <div className="ag-wiz-foot-end">
              {step > 0 && (
                <button type="button" className="ag-btn ag-btn--ghost" onClick={() => go(step - 1)}>
                  <ArrowLeft size={14} aria-hidden="true" /> Atrás
                </button>
              )}
              {!last && (
                <button type="button" className="ag-btn ag-btn--accent" disabled={blocked} onClick={() => go(step + 1)}>
                  Siguiente <ArrowRight size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
        <aside className="ag-aside" aria-label="Vista previa">{aside}</aside>
      </div>
    </div>
  );
}
