'use client';

import React, { useEffect, useId, useRef } from 'react';
import { ArrowDown, ArrowUp, Clock, GitBranch, PlayCircle, Trash2, type LucideIcon } from 'lucide-react';
import {
  ACTION_META,
  ACTION_ORDER,
  CONDITION_META,
  CONDITION_ORDER,
  PLACEHOLDER_HELP,
  type FieldDef,
} from '@/lib/automations/ui-meta';
import type { StepType, WorkflowStep } from '@/lib/automations/types';
import {
  STEP_LABELS,
  STEP_TYPES,
  defaultsForFields,
  isActionType,
  isConditionCheck,
  newStep,
  summarizeStep,
  type ConfigMap,
} from './step-model';

const STEP_ICONS: Record<StepType, LucideIcon> = { condition: GitBranch, delay: Clock, action: PlayCircle };

function asText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

// ============================================================
// Campo genérico (texto / número / select / textarea)
// ============================================================
export function FieldInput({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: string | number) => void }) {
  const id = useId();
  const helpId = `${id}-help`;
  const showPlaceholderHelp =
    field.type === 'textarea' || (field.type === 'text' && (field.key === 'title' || field.key === 'message' || field.key === 'body'));
  const describedBy = field.help || showPlaceholderHelp ? helpId : undefined;

  return (
    <div className="bd-field">
      <label className="bd-label" htmlFor={id}>{field.label}</label>
      {field.type === 'select' ? (
        <select id={id} aria-describedby={describedBy} className="input" value={asText(value)} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea id={id} aria-describedby={describedBy} className="input bd-textarea" value={asText(value)} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'number' ? (
        <input
          id={id}
          aria-describedby={describedBy}
          className="input"
          type="number"
          value={asText(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      ) : (
        <input id={id} aria-describedby={describedBy} className="input" type="text" value={asText(value)} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {(field.help || showPlaceholderHelp) && (
        <div className="bd-help" id={helpId}>
          {field.help}
          {field.help && showPlaceholderHelp ? ' ' : ''}
          {showPlaceholderHelp ? PLACEHOLDER_HELP : ''}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Tarjeta de un paso del flujo
// ============================================================
interface StepCardProps {
  step: WorkflowStep;
  index: number;
  total: number;
  autoFocus: boolean;
  onFocused: () => void;
  onChange: (step: WorkflowStep) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

export function StepCard({ step, index, total, autoFocus, onFocused, onChange, onRemove, onMove }: StepCardProps) {
  const id = useId();
  const Icon = STEP_ICONS[step.type];
  const label = STEP_LABELS[step.type];
  const setConfig = (patch: ConfigMap) => onChange({ ...step, config: { ...step.config, ...patch } });
  const changeType = (type: StepType) => {
    if (type !== step.type) onChange({ ...newStep(type), id: step.id });
  };
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!autoFocus) return;
    rootRef.current?.querySelector<HTMLElement>('select, input, textarea')?.focus();
    rootRef.current?.scrollIntoView({ block: 'nearest' });
    onFocused();
  }, [autoFocus, onFocused]);

  const check = isConditionCheck(step.config.check) ? step.config.check : null;
  const action = isActionType(step.config.action) ? step.config.action : null;

  return (
    <section ref={rootRef} className={`card bd-step bd-step--${step.type}`} aria-labelledby={`${id}-title`}>
      <header className="bd-step-head">
        <span className="bd-step-n" aria-hidden="true">{index + 1}</span>
        <div className="bd-step-title">
          <h3 id={`${id}-title`}><Icon size={15} aria-hidden="true" /> {label}</h3>
          <p>{summarizeStep(step)}</p>
        </div>
        <div className="bd-step-tools">
          <button type="button" className="au-btn au-btn--ghost au-btn--icon au-btn--sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Subir el paso ${index + 1}`} title="Subir">
            <ArrowUp size={14} aria-hidden="true" />
          </button>
          <button type="button" className="au-btn au-btn--ghost au-btn--icon au-btn--sm" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={`Bajar el paso ${index + 1}`} title="Bajar">
            <ArrowDown size={14} aria-hidden="true" />
          </button>
          <button type="button" className="au-btn au-btn--ghost au-btn--icon au-btn--sm" onClick={onRemove} aria-label={`Eliminar el paso ${index + 1}`} title="Eliminar">
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="bd-seg" role="group" aria-label={`Tipo del paso ${index + 1}`}>
        {STEP_TYPES.map((type) => {
          const TypeIcon = STEP_ICONS[type];
          return (
            <button key={type} type="button" className="bd-seg-btn" aria-pressed={step.type === type} onClick={() => changeType(type)}>
              <TypeIcon size={13} aria-hidden="true" /> {STEP_LABELS[type]}
            </button>
          );
        })}
      </div>

      {step.type === 'condition' && (
        <>
          <div className="bd-field">
            <label className="bd-label" htmlFor={`${id}-check`}>Si…</label>
            <select
              id={`${id}-check`}
              className="input"
              value={check ?? ''}
              onChange={(e) => {
                const next = e.target.value;
                if (isConditionCheck(next)) onChange({ ...step, config: { check: next, ...defaultsForFields(CONDITION_META[next].fields) } });
              }}
            >
              {CONDITION_ORDER.map((c) => (
                <option key={c} value={c}>{CONDITION_META[c].label}</option>
              ))}
            </select>
          </div>
          {check && CONDITION_META[check].fields.map((f) => (
            <FieldInput key={f.key} field={f} value={step.config[f.key]} onChange={(v) => setConfig({ [f.key]: v })} />
          ))}
          <p className="bd-help">Si la condición NO se cumple, el flujo se detiene aquí (queda como «Omitido»).</p>
        </>
      )}

      {step.type === 'delay' && (
        <div className="bd-pair">
          <div className="bd-field">
            <label className="bd-label" htmlFor={`${id}-amount`}>Esperar</label>
            <input
              id={`${id}-amount`}
              className="input"
              type="number"
              min={1}
              value={asText(step.config.amount ?? 1)}
              onChange={(e) => setConfig({ amount: Number(e.target.value) || 1 })}
            />
          </div>
          <div className="bd-field">
            <label className="bd-label" htmlFor={`${id}-unit`}>Unidad</label>
            <select id={`${id}-unit`} className="input" value={asText(step.config.unit) || 'hours'} onChange={(e) => setConfig({ unit: e.target.value })}>
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
              <option value="days">Días</option>
            </select>
          </div>
        </div>
      )}

      {step.type === 'action' && (
        <>
          <div className="bd-field">
            <label className="bd-label" htmlFor={`${id}-action`}>Hacer…</label>
            <select
              id={`${id}-action`}
              className="input"
              value={action ?? ''}
              onChange={(e) => {
                const next = e.target.value;
                if (isActionType(next)) onChange({ ...step, config: { action: next, ...defaultsForFields(ACTION_META[next].fields) } });
              }}
            >
              {ACTION_ORDER.map((a) => (
                <option key={a} value={a}>{ACTION_META[a].label}</option>
              ))}
            </select>
          </div>
          {action && ACTION_META[action].fields.map((f) => (
            <FieldInput key={f.key} field={f} value={step.config[f.key]} onChange={(v) => setConfig({ [f.key]: v })} />
          ))}
        </>
      )}
    </section>
  );
}
