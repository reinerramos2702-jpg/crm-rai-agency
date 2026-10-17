'use client';

import React from 'react';
import { ChevronDown, ChevronUp, Clock, GitBranch, PlayCircle, Trash2 } from 'lucide-react';
import {
  ACTION_META,
  ACTION_ORDER,
  CONDITION_META,
  CONDITION_ORDER,
  PLACEHOLDER_HELP,
  type FieldDef,
} from '@/lib/automations/ui-meta';
import type { ActionType, ConditionCheck, StepType, WorkflowStep } from '@/lib/automations/types';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultsForFields(fields: FieldDef[]): Record<string, any> {
  const cfg: Record<string, any> = {};
  for (const f of fields) {
    if (f.default !== undefined) cfg[f.key] = f.default;
    else if (f.type === 'select' && f.options && f.options.length > 0) cfg[f.key] = f.options[0].value;
    else cfg[f.key] = '';
  }
  return cfg;
}

export function newStep(type: StepType): WorkflowStep {
  if (type === 'condition') {
    const check = CONDITION_ORDER[0];
    return { id: uid(), type, config: { check, ...defaultsForFields(CONDITION_META[check].fields) } };
  }
  if (type === 'delay') {
    return { id: uid(), type, config: { amount: 1, unit: 'hours' } };
  }
  const action = ACTION_ORDER[0];
  return { id: uid(), type, config: { action, ...defaultsForFields(ACTION_META[action].fields) } };
}

// ============================================================
// Campo genérico (texto / número / select / textarea)
// ============================================================
export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}) {
  const showPlaceholderHelp =
    field.type === 'textarea' || (field.type === 'text' && (field.key === 'title' || field.key === 'message' || field.key === 'body'));

  return (
    <div style={{ marginBottom: 10 }}>
      <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
        {field.label}
      </label>
      {field.type === 'select' ? (
        <select className="input" style={{ width: '100%' }} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          className="input"
          style={{ width: '100%', minHeight: 70, resize: 'vertical' }}
          value={value ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === 'number' ? (
        <input
          className="input"
          type="number"
          style={{ width: '100%' }}
          value={value ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      ) : (
        <input
          className="input"
          type="text"
          style={{ width: '100%' }}
          value={value ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.help && (
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
          {field.help}
        </div>
      )}
      {showPlaceholderHelp && (
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
          {PLACEHOLDER_HELP}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Tarjeta de un paso del flujo
// ============================================================
export function StepCard({
  step,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  step: WorkflowStep;
  index: number;
  total: number;
  onChange: (step: WorkflowStep) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  function setConfig(patch: Record<string, any>) {
    onChange({ ...step, config: { ...step.config, ...patch } });
  }

  function changeType(type: StepType) {
    onChange(newStep(type));
  }

  let icon = <PlayCircle size={15} />;
  let label = 'Acción';
  let color = 'var(--rai-gold)';
  if (step.type === 'condition') {
    icon = <GitBranch size={15} />;
    label = 'Condición';
    color = '#7aa2f7';
  } else if (step.type === 'delay') {
    icon = <Clock size={15} />;
    label = 'Espera';
    color = '#bb9af7';
  }

  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="row-between mb-4">
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(136,136,170,0.1)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {index + 1}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            {icon} {label}
          </span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <ChevronUp
            size={15}
            style={{ cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}
            onClick={() => index > 0 && onMove(-1)}
          />
          <ChevronDown
            size={15}
            style={{ cursor: index === total - 1 ? 'not-allowed' : 'pointer', opacity: index === total - 1 ? 0.3 : 1 }}
            onClick={() => index < total - 1 && onMove(1)}
          />
          <Trash2 size={15} style={{ cursor: 'pointer' }} onClick={onRemove} />
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button className={step.type === 'condition' ? 'primary' : 'ghost'} style={{ flex: 1 }} onClick={() => changeType('condition')}>
          <GitBranch size={13} /> Condición
        </button>
        <button className={step.type === 'delay' ? 'primary' : 'ghost'} style={{ flex: 1 }} onClick={() => changeType('delay')}>
          <Clock size={13} /> Espera
        </button>
        <button className={step.type === 'action' ? 'primary' : 'ghost'} style={{ flex: 1 }} onClick={() => changeType('action')}>
          <PlayCircle size={13} /> Acción
        </button>
      </div>

      {/* ---- Condición ---- */}
      {step.type === 'condition' && (
        <>
          <div style={{ marginBottom: 10 }}>
            <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Si...
            </label>
            <select
              className="input"
              style={{ width: '100%' }}
              value={step.config.check}
              onChange={(e) => {
                const check = e.target.value as ConditionCheck;
                onChange({ ...step, config: { check, ...defaultsForFields(CONDITION_META[check].fields) } });
              }}
            >
              {CONDITION_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_META[c].label}
                </option>
              ))}
            </select>
          </div>
          {CONDITION_META[step.config.check as ConditionCheck]?.fields.map((f) => (
            <FieldInput key={f.key} field={f} value={step.config[f.key]} onChange={(v) => setConfig({ [f.key]: v })} />
          ))}
          <p className="muted" style={{ fontSize: 11 }}>
            Si la condición NO se cumple, el flujo se detiene aquí (queda como "Omitido").
          </p>
        </>
      )}

      {/* ---- Espera ---- */}
      {step.type === 'delay' && (
        <div className="row" style={{ gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Esperar
            </label>
            <input
              className="input"
              type="number"
              min={1}
              style={{ width: '100%' }}
              value={step.config.amount ?? 1}
              onChange={(e) => setConfig({ amount: Number(e.target.value) || 1 })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Unidad
            </label>
            <select className="input" style={{ width: '100%' }} value={step.config.unit ?? 'hours'} onChange={(e) => setConfig({ unit: e.target.value })}>
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
              <option value="days">Días</option>
            </select>
          </div>
        </div>
      )}

      {/* ---- Acción ---- */}
      {step.type === 'action' && (
        <>
          <div style={{ marginBottom: 10 }}>
            <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Hacer...
            </label>
            <select
              className="input"
              style={{ width: '100%' }}
              value={step.config.action}
              onChange={(e) => {
                const action = e.target.value as ActionType;
                onChange({ ...step, config: { action, ...defaultsForFields(ACTION_META[action].fields) } });
              }}
            >
              {ACTION_ORDER.map((a) => (
                <option key={a} value={a}>
                  {ACTION_META[a].label}
                </option>
              ))}
            </select>
          </div>
          {ACTION_META[step.config.action as ActionType]?.fields.map((f) => (
            <FieldInput key={f.key} field={f} value={step.config[f.key]} onChange={(v) => setConfig({ [f.key]: v })} />
          ))}
        </>
      )}
    </div>
  );
}

