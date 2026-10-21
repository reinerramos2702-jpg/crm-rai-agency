import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, ChevronUp, Clock, PauseCircle, PlayCircle, RotateCcw } from 'lucide-react';
import type { LaunchpadStep } from '@/lib/launchpad-steps';
import type { StepState } from '@/lib/launchpad-prefs';
import { stepIcon } from './launchpad-icons';

interface StepRowProps {
  step: LaunchpadStep;
  state: StepState;
  isManual: boolean;
  /** Ya llegó el progreso del servidor (hasta entonces no se afirma nada sobre los pasos automáticos). */
  hasData: boolean;
  isOpen: boolean;
  isPopping: boolean;
  tutorialSlides: number;
  onToggleOpen: () => void;
  onToggleManual: () => void;
  onToggleSkip: () => void;
  onOpenTutorial: () => void;
}

const RING_R = 13;
const RING_C = 2 * Math.PI * RING_R;

/** Una fila de la guía: estado, motivo si es automática, tiempo estimado y acciones. */
export function StepRow({
  step, state, isManual, hasData, isOpen, isPopping, tutorialSlides,
  onToggleOpen, onToggleManual, onToggleSkip, onOpenTutorial,
}: StepRowProps) {
  const Icon = stepIcon(step.id);
  const isDone = state === 'done';
  const isSkipped = state === 'skipped';
  const ringLabel = isManual
    ? isDone ? 'Marcar como pendiente' : 'Marcar como completado'
    : 'Se completa automáticamente según tu actividad';

  return (
    <div className={`lp-row${isDone ? ' is-done' : ''}${isSkipped ? ' is-skipped' : ''}`} id={`paso-${step.id}`}>
      <div className="row-between lp-item" style={{ padding: '14px 16px', gap: 12 }}>
        <div className="row" style={{ gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onToggleOpen}>
          <div
            role={isManual ? 'button' : undefined}
            tabIndex={isManual ? 0 : undefined}
            aria-pressed={isManual ? isDone : undefined}
            onClick={(e) => { e.stopPropagation(); if (isManual) onToggleManual(); }}
            onKeyDown={(e) => {
              if (isManual && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); onToggleManual(); }
            }}
            className={`lp-ring${isPopping ? ' is-pop' : ''}`}
            aria-label={ringLabel}
            title={isManual ? undefined : ringLabel}
            style={{ marginTop: 1, cursor: isManual ? 'pointer' : 'default' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32">
              <circle className="lp-ring-track" cx="16" cy="16" r={RING_R} strokeWidth="3" />
              <circle
                className={`lp-ring-fill ${isDone ? 'done' : ''}`}
                cx="16" cy="16" r={RING_R} strokeWidth="3"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - (isDone ? 1 : 0))}
              />
            </svg>
            {isDone && <Check size={14} strokeWidth={3} className="lp-ring-check" />}
          </div>
          <Icon size={16} color="var(--rai-gold)" className="lp-row-icon" style={{ marginTop: 8, flexShrink: 0 }} />
          <div style={{ marginTop: 4 }}>
            <div className="lp-row-title">
              {step.title}
              {isSkipped && <span className="lp-badge-skip"><PauseCircle size={11} aria-hidden="true" /> Pospuesto</span>}
            </div>
            <div className="muted mt-2 lp-row-desc" style={{ fontSize: 12, maxWidth: 560 }}>{step.description}</div>

            <div className="lp-meta">
              {!isDone && <span className="lp-time"><Clock size={11} aria-hidden="true" /> ≈ {step.minutes} min</span>}
              {hasData && !isManual && (
                <span className="lp-auto">
                  <span className={`fx-dot ${isDone ? 'fx-dot--ok' : 'fx-dot--warn'}`} aria-hidden="true" />
                  <span>{isDone ? 'Completado automáticamente' : 'Se completará solo según tu actividad'}</span>
                </span>
              )}
            </div>

            {hasData && !isManual && !isDone && (
              <div className="lp-why">
                {step.autoHow && <span>{step.autoHow}</span>}
                <Link href={step.href} className="btn btn-secondary btn-sm lp-go" onClick={(e) => e.stopPropagation()}>
                  Ir a hacerlo <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="row lp-item-end" style={{ gap: 10, flexShrink: 0, alignItems: 'center' }}>
          <span className={`lp-pct ${isDone ? 'done' : ''}`}>{isDone ? 100 : 0}%</span>
          <button onClick={onToggleOpen} className="ghost btn-sm" style={{ padding: 6 }} aria-expanded={isOpen} aria-label={isOpen ? 'Contraer paso' : 'Expandir paso'}>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="lp-open">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Link href={step.href} className="btn btn-secondary btn-sm">
              Ir al módulo
              <ArrowRight size={14} />
            </Link>
            <button onClick={onOpenTutorial} className="ghost btn-sm">
              <PlayCircle size={14} />
              Ver tutorial
              {tutorialSlides ? <span className="badge badge-gold" style={{ marginLeft: 4 }}>{tutorialSlides}</span> : null}
            </button>
            {!isDone && (
              <button onClick={onToggleSkip} className="ghost btn-sm" title={isSkipped ? 'Volver a sugerir este paso' : 'No lo sugeriré como siguiente paso'}>
                {isSkipped ? <RotateCcw size={14} /> : <PauseCircle size={14} />}
                {isSkipped ? 'Retomar' : 'Más tarde'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
