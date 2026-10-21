'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Clock, GitBranch, Info, Loader2, Pause, Play, PlayCircle, RefreshCw, Save, Zap } from 'lucide-react';
import { needsActivationConfirm } from '@/lib/automation-safety';
import { STATUS_LABELS, TRIGGER_META, TRIGGER_ORDER } from '@/lib/automations/ui-meta';
import type { StepType } from '@/lib/automations/types';
import { ActivationDialog } from '../components/ActivationDialog';
import { useAutomationPrefs } from '../use-automation-prefs';
import { useAutomationSettings } from '../use-automation-settings';
import { BuilderSkeleton } from './BuilderSkeleton';
import { FieldInput, StepCard } from './builder-parts';
import { RunsPanel } from './RunsPanel';
import { STEP_LABELS, isTriggerType } from './step-model';
import { useWorkflowEditor } from './use-workflow-editor';

const ADD_BUTTONS: Array<{ type: StepType; icon: typeof Clock }> = [
  { type: 'condition', icon: GitBranch },
  { type: 'delay', icon: Clock },
  { type: 'action', icon: PlayCircle },
];

export default function AutomationBuilderPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const ed = useWorkflowEditor(id);
  const { prefs } = useAutomationPrefs();
  const { settings: engineSettings } = useAutomationSettings();
  const [confirmActivate, setConfirmActivate] = useState(false);

  const { load, status, triggerType, steps } = ed;
  const trigMeta = TRIGGER_META[triggerType];
  const active = status === 'active';

  function requestToggle() {
    if (prefs.confirmSend && needsActivationConfirm({ status, trigger: { type: triggerType }, steps })) setConfirmActivate(true);
    else void ed.toggleActive();
  }

  if (load.kind === 'notfound') {
    return (
      <div className="container rai-page bd-page">
        <div className="card bd-notice">
          <Zap size={32} aria-hidden="true" className="bd-notice-ico" />
          <h1 className="bd-notice-title">Este flujo no existe</h1>
          <p className="bd-help">Puede que se haya eliminado. Vuelve a la lista para ver tus flujos.</p>
          <Link href="/automatizacion" className="au-btn au-btn--primary"><ArrowLeft size={14} aria-hidden="true" /> Volver a Automatización</Link>
        </div>
      </div>
    );
  }

  const ready = load.kind === 'ready';

  return (
    <div className="container rai-page bd-page">
      <header className="bd-head">
        <div className="bd-head-main">
          <Link href="/automatizacion" className="bd-back"><ArrowLeft size={14} aria-hidden="true" /> Automatización</Link>
          {ready ? (
            <>
              <h1 className="fx-sr-only">Editor de flujo</h1>
              <input
                className="input bd-name"
                value={ed.name}
                onChange={(e) => ed.setName(e.target.value)}
                placeholder="Nombre del flujo"
                aria-label="Nombre del flujo"
                maxLength={120}
              />
              <input
                className="input bd-desc"
                value={ed.description}
                onChange={(e) => ed.setDescription(e.target.value)}
                placeholder="Descripción breve (opcional)"
                aria-label="Descripción del flujo"
              />
            </>
          ) : (
            <h1 className="h1 bd-loading-title">{load.kind === 'error' ? 'No se pudo abrir el flujo' : 'Cargando flujo…'}</h1>
          )}
        </div>

        {ready && (
          <div className="bd-actions">
            <span className={`bd-pill bd-pill--${status}`}>
              <span className={`fx-dot ${active ? 'fx-dot--ok' : status === 'paused' ? 'fx-dot--warn' : ''}`} aria-hidden="true" />
              {STATUS_LABELS[status] ?? status}
            </span>
            {ed.dirty && <span className="bd-dirty" role="status">Cambios sin guardar</span>}
            <button type="button" className="au-btn" onClick={() => void ed.save(true)} disabled={ed.saving || !ed.dirty}>
              {ed.saving ? <Loader2 size={14} className="au-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />} Guardar
            </button>
            <button type="button" className={`au-btn ${active ? 'au-btn--danger' : 'au-btn--primary'}`} onClick={requestToggle} disabled={ed.busyStatus || ed.saving}>
              {ed.busyStatus ? <Loader2 size={14} className="au-spin" aria-hidden="true" /> : active ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {active ? ' Pausar' : ' Activar'}
            </button>
          </div>
        )}
      </header>

      {load.kind === 'loading' && <BuilderSkeleton />}

      {load.kind === 'error' && (
        <div className="au-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" /> {load.message}
          <button type="button" className="au-btn au-btn--sm" onClick={() => void ed.reload()}><RefreshCw size={13} aria-hidden="true" /> Reintentar</button>
        </div>
      )}

      {ready && (
        <div className="bd-grid">
          <div className="bd-col">
            <section className="card bd-card" aria-labelledby="bd-folder-label">
              <label id="bd-folder-label" className="bd-label" htmlFor="bd-folder">Carpeta</label>
              <select id="bd-folder" className="input bd-folder" value={ed.folderId} onChange={(e) => ed.setFolderId(e.target.value)}>
                <option value="">Sin carpeta</option>
                {ed.folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </section>

            <section className="card bd-card bd-trigger" aria-labelledby="bd-trigger-title">
              <h2 id="bd-trigger-title" className="bd-block-title"><Zap size={16} aria-hidden="true" /> Cuando ocurre…</h2>
              <div className="bd-field">
                <label className="bd-label" htmlFor="bd-trigger-type">Disparador</label>
                <select id="bd-trigger-type" className="input" value={triggerType} onChange={(e) => {
                    const next = e.target.value;
                    if (isTriggerType(next)) ed.changeTriggerType(next);
                  }}>
                  <optgroup label="Eventos en tiempo real">
                    {TRIGGER_ORDER.filter((t) => TRIGGER_META[t].category === 'evento').map((t) => (
                      <option key={t} value={t}>{TRIGGER_META[t].label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Revisiones periódicas (cron)">
                    {TRIGGER_ORDER.filter((t) => TRIGGER_META[t].category === 'tiempo').map((t) => (
                      <option key={t} value={t}>{TRIGGER_META[t].label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <p className="bd-help">{trigMeta.description}</p>
              {trigMeta.fields.map((f) => (
                <FieldInput key={f.key} field={f} value={ed.triggerConfig[f.key]} onChange={(v) => ed.setTriggerField(f.key, v)} />
              ))}
              {trigMeta.category === 'tiempo' && (
                <p className="bd-help bd-help--icon"><Info size={13} aria-hidden="true" /> Este disparador se evalúa en cada corrida automática (cron), no al instante.</p>
              )}
            </section>

            <ol className="bd-steps" aria-label="Pasos del flujo">
              {steps.map((step, i) => (
                <li key={step.id} className="bd-step-item">
                  <span className="bd-conn" aria-hidden="true" />
                  <StepCard
                    step={step}
                    index={i}
                    total={steps.length}
                    autoFocus={ed.lastAdded === step.id}
                    onFocused={ed.clearLastAdded}
                    onChange={(s) => ed.updateStep(i, s)}
                    onRemove={() => ed.removeStep(i)}
                    onMove={(dir) => ed.moveStep(i, dir)}
                  />
                </li>
              ))}
            </ol>

            {steps.length === 0 && (
              <p className="bd-empty">Este flujo todavía no tiene pasos. Agrega condiciones, esperas y acciones para definir qué pasa cuando se dispara.</p>
            )}

            <div className="card bd-add" role="group" aria-label="Agregar un paso">
              {ADD_BUTTONS.map(({ type, icon: Icon }) => (
                <button key={type} type="button" className="au-btn au-btn--soft" onClick={() => ed.addStep(type)}>
                  <Icon size={14} aria-hidden="true" /> Agregar {STEP_LABELS[type].toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <RunsPanel runs={ed.runs} zone={prefs.displayZone} />
        </div>
      )}

      {confirmActivate && (
        <ActivationDialog
          flow={{ name: ed.name.trim() || 'Este flujo', status, trigger: { type: triggerType }, steps }}
          webhookConfigured={engineSettings ? !!engineSettings.n8nWebhookUrl : null}
          busy={ed.busyStatus || ed.saving}
          onCancel={() => setConfirmActivate(false)}
          onConfirm={() => {
            setConfirmActivate(false);
            void ed.toggleActive();
          }}
        />
      )}
    </div>
  );
}
