'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Zap,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GitBranch,
  Clock,
  PlayCircle,
  Loader2,
  Save,
  Play,
  Pause,
  Activity,
  Info,
  ChevronsDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  TRIGGER_META,
  TRIGGER_ORDER,
  ACTION_META,
  ACTION_ORDER,
  CONDITION_META,
  CONDITION_ORDER,
  PLACEHOLDER_HELP,
  STATUS_LABELS,
  RUN_STATUS_LABELS,
  type FieldDef,
} from '@/lib/automations/ui-meta';
import type {
  TriggerType,
  ActionType,
  ConditionCheck,
  StepType,
  WorkflowStep,
} from '@/lib/automations/types';

interface FolderT {
  id: string;
  name: string;
}

interface RunT {
  id: string;
  status: string;
  contactName: string | null;
  trigger: any;
  result: { log?: { step: string; ok: boolean; detail: string }[] } | null;
  error: string | null;
  createdAt: string;
}

interface WorkflowDetail {
  id: string;
  name: string;
  description: string | null;
  folderId: string | null;
  status: string;
  trigger: { type: TriggerType; config: Record<string, any> };
  steps: WorkflowStep[];
  runs: RunT[];
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-muted',
  active: 'badge-success',
  paused: 'badge-warning',
};

const RUN_STATUS_BADGE: Record<string, string> = {
  success: 'badge-success',
  error: 'badge-error',
  skipped: 'badge-muted',
  pending: 'badge-gold',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultsForFields(fields: FieldDef[]): Record<string, any> {
  const cfg: Record<string, any> = {};
  for (const f of fields) {
    if (f.default !== undefined) cfg[f.key] = f.default;
    else if (f.type === 'select' && f.options && f.options.length > 0) cfg[f.key] = f.options[0].value;
    else cfg[f.key] = '';
  }
  return cfg;
}

function newStep(type: StepType): WorkflowStep {
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
function FieldInput({
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
function StepCard({
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

// ============================================================
// Página principal del builder
// ============================================================
export default function AutomationBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [folders, setFolders] = useState<FolderT[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);

  // Campos editables
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [status, setStatus] = useState('draft');
  const [triggerType, setTriggerType] = useState<TriggerType>('contact.created');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [wfRes, foldersRes] = await Promise.all([fetch(`/api/automations/${id}`), fetch('/api/automations/folders')]);

      if (wfRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (wfRes.ok) {
        const data = await wfRes.json();
        const wf: WorkflowDetail = data.workflow;
        setWorkflow(wf);
        setName(wf.name);
        setDescription(wf.description || '');
        setFolderId(wf.folderId || '');
        setStatus(wf.status);
        setTriggerType(wf.trigger?.type || 'contact.created');
        setTriggerConfig(wf.trigger?.config || {});
        setSteps(Array.isArray(wf.steps) ? wf.steps : []);
      } else {
        toast.error(`Error del servidor (${wfRes.status})`);
      }
      if (foldersRes.ok) {
        const fdata = await foldersRes.json();
        setFolders(fdata.folders || []);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleTriggerTypeChange(type: TriggerType) {
    setTriggerType(type);
    setTriggerConfig(defaultsForFields(TRIGGER_META[type].fields));
  }

  function addStep(type: StepType) {
    setSteps((prev) => [...prev, newStep(type)]);
  }

  function updateStep(index: number, step: WorkflowStep) {
    setSteps((prev) => prev.map((s, i) => (i === index ? step : s)));
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save(showToast = true) {
    if (!name.trim()) {
      toast.error('El nombre del flujo es requerido.');
      return false;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          folderId: folderId || null,
          trigger: { type: triggerType, config: triggerConfig },
          steps,
        }),
      });
      if (res.ok) {
        if (showToast) toast.success('Flujo guardado.');
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
        return false;
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    // Guarda primero los cambios pendientes, luego cambia el estado.
    const ok = await save(false);
    if (!ok) return;
    const next = status === 'active' ? 'paused' : 'active';
    setBusyStatus(true);
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setStatus(next);
        toast.success(next === 'active' ? 'Flujo activado y guardado.' : 'Flujo pausado.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setBusyStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="row" style={{ justifyContent: 'center', padding: 60 }}>
          <Loader2 className="animate-spin" size={28} />
        </div>
      </div>
    );
  }

  if (notFound || !workflow) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Zap size={32} className="muted" style={{ marginBottom: 8 }} />
          <p className="muted">Este flujo no existe o fue eliminado.</p>
          <Link href="/automatizacion">
            <button className="primary" style={{ marginTop: 12 }}>
              <ArrowLeft size={14} /> Volver a Automatización
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const trigMeta = TRIGGER_META[triggerType];

  return (
    <div className="container">
      {/* Header */}
      <div className="row-between mb-6" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Link href="/automatizacion" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>
            <ArrowLeft size={14} /> Automatización
          </Link>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del flujo"
            style={{ fontSize: 22, fontWeight: 800, padding: '8px 12px', width: '100%', maxWidth: 520, marginBottom: 8 }}
          />
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción breve (opcional)"
            style={{ width: '100%', maxWidth: 520 }}
          />
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <span className={STATUS_BADGE[status] || 'badge-muted'} style={{ marginTop: 6 }}>
            {STATUS_LABELS[status] || status}
          </span>
          <button className="secondary" onClick={() => save(true)} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Guardar
          </button>
          <button className={status === 'active' ? 'danger' : 'primary'} onClick={toggleActive} disabled={busyStatus || saving}>
            {busyStatus ? (
              <Loader2 className="animate-spin" size={14} />
            ) : status === 'active' ? (
              <>
                <Pause size={14} /> Pausar
              </>
            ) : (
              <>
                <Play size={14} /> Activar
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* Columna principal: trigger + pasos */}
        <div>
          {/* Carpeta */}
          <div className="card mb-4">
            <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Carpeta
            </label>
            <select className="input" style={{ width: '100%', maxWidth: 320 }} value={folderId} onChange={(e) => setFolderId(e.target.value)}>
              <option value="">Sin carpeta</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Disparador */}
          <div className="card mb-4" style={{ borderLeft: '3px solid var(--rai-gold)' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <Zap size={16} color="var(--rai-gold)" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Cuando ocurre...</span>
            </div>
            <div style={{ marginBottom: 10 }}>
              <select
                className="input"
                style={{ width: '100%' }}
                value={triggerType}
                onChange={(e) => handleTriggerTypeChange(e.target.value as TriggerType)}
              >
                <optgroup label="Eventos en tiempo real">
                  {TRIGGER_ORDER.filter((t) => TRIGGER_META[t].category === 'evento').map((t) => (
                    <option key={t} value={t}>
                      {TRIGGER_META[t].label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Revisiones periódicas (cron)">
                  {TRIGGER_ORDER.filter((t) => TRIGGER_META[t].category === 'tiempo').map((t) => (
                    <option key={t} value={t}>
                      {TRIGGER_META[t].label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: trigMeta.fields.length ? 12 : 0 }}>
              {trigMeta.description}
            </p>
            {trigMeta.fields.map((f) => (
              <FieldInput key={f.key} field={f} value={triggerConfig[f.key]} onChange={(v) => setTriggerConfig((c) => ({ ...c, [f.key]: v }))} />
            ))}
            {trigMeta.category === 'tiempo' && (
              <div className="row" style={{ gap: 6, alignItems: 'flex-start', marginTop: 8 }}>
                <Info size={13} className="muted" style={{ marginTop: 2, flexShrink: 0 }} />
                <p className="muted" style={{ fontSize: 11, margin: 0 }}>
                  Este disparador se evalúa en cada corrida automática (cron), no al instante.
                </p>
              </div>
            )}
          </div>

          {/* Pasos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, i) => (
              <React.Fragment key={step.id}>
                <StepCard
                  step={step}
                  index={i}
                  total={steps.length}
                  onChange={(s) => updateStep(i, s)}
                  onRemove={() => removeStep(i)}
                  onMove={(dir) => moveStep(i, dir)}
                />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ChevronsDown size={16} className="muted" />
                </div>
              </React.Fragment>
            ))}

            {steps.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
                <p className="muted" style={{ marginBottom: 0 }}>
                  Este flujo todavía no tiene pasos. Agrega condiciones, esperas y acciones para definir qué pasa
                  cuando se dispara.
                </p>
              </div>
            )}

            {/* Agregar paso */}
            <div className="card" style={{ background: 'rgba(136,136,170,0.04)' }}>
              <div className="row" style={{ gap: 8 }}>
                <button className="ghost" style={{ flex: 1 }} onClick={() => addStep('condition')}>
                  <GitBranch size={13} /> + Condición
                </button>
                <button className="ghost" style={{ flex: 1 }} onClick={() => addStep('delay')}>
                  <Clock size={13} /> + Espera
                </button>
                <button className="ghost" style={{ flex: 1 }} onClick={() => addStep('action')}>
                  <PlayCircle size={13} /> + Acción
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Columna lateral: ejecuciones recientes */}
        <div className="card">
          <div className="row" style={{ gap: 6, alignItems: 'center', marginBottom: 12 }}>
            <Activity size={15} />
            <span style={{ fontWeight: 600 }}>Ejecuciones recientes</span>
          </div>
          {workflow.runs.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>
              Aún no hay ejecuciones para este flujo.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {workflow.runs.map((r) => (
                <div key={r.id} style={{ borderBottom: '1px solid var(--rai-border)', paddingBottom: 8 }}>
                  <div className="row-between" style={{ marginBottom: 2 }}>
                    <span className={RUN_STATUS_BADGE[r.status] || 'badge-muted'} style={{ fontSize: 10 }}>
                      {RUN_STATUS_LABELS[r.status] || r.status}
                    </span>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {fmtDate(r.createdAt)}
                    </span>
                  </div>
                  {r.contactName && <div style={{ fontSize: 12 }}>{r.contactName}</div>}
                  {r.error && (
                    <div style={{ fontSize: 11, color: 'var(--rai-error)', marginTop: 2 }}>
                      {r.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
