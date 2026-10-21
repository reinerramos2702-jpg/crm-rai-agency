'use client';

import React, { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { analyzeFlow } from '@/lib/automation-safety';
import { errorMessage } from '../api';
import type { SettingsT, WorkflowT } from '../types';
import { Dialog } from './Dialog';

interface EngineCardProps {
  settings: SettingsT | null;
  loading: boolean;
  save: (patch: Partial<SettingsT>) => Promise<void>;
  workflows: WorkflowT[];
}

/** Interruptor general del motor, con el impacto real (cuántos flujos activos y cuántos escriben a clientes). */
export function EngineCard({ settings, loading, save, workflows }: EngineCardProps) {
  const [saving, setSaving] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const enabled = settings?.automationsEnabled ?? true;
  const active = workflows.filter((w) => w.status === 'active' && !w.id.startsWith('tmp-'));
  const sending = active.filter((w) => analyzeFlow(w).sendsMessages).length;

  async function setEnabled(next: boolean) {
    setSaving(true);
    try {
      await save({ automationsEnabled: next });
      toast.success(next ? 'Automatización activada.' : 'Automatización pausada globalmente.');
    } catch (e: unknown) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const impact = enabled
    ? active.length === 0
      ? 'Hoy no tienes flujos activos, así que apagarlo no cambia nada todavía.'
      : `Si lo apagas, ${active.length === 1 ? 'tu flujo activo dejará' : `tus ${active.length} flujos activos dejarán`} de ejecutarse${sending > 0 ? ` y ${sending === 1 ? 'uno dejará' : `${sending} dejarán`} de escribir a clientes` : ''}.`
    : `Al reactivarlo, ${active.length === 0 ? 'ningún flujo se reanuda (no hay activos)' : `${active.length === 1 ? 'se reanuda 1 flujo activo' : `se reanudan ${active.length} flujos activos`}`}. Lo ocurrido mientras estuvo pausado no se ejecuta después.`;

  return (
    <div className="au-st-card">
      <div className="st-card-head">
        <div>
          <h3 className="st-card-title"><Zap size={16} /> Motor de automatización</h3>
          <p className="st-card-text">
            Interruptor general. Si lo desactivas, ningún flujo se ejecutará (ni por eventos ni por la tarea programada), aunque esté
            marcado como «Activo». Útil para pausar todo de golpe.
          </p>
          {!loading && <p className="st-impact" role="status">{impact}</p>}
        </div>
        {loading ? (
          <SkeletonLine width={96} height={36} />
        ) : (
          <div className="st-card-side">
            <span className="st-state">
              <span className={`fx-dot ${enabled ? 'fx-dot--ok' : 'fx-dot--danger'}`} aria-hidden="true" />
              {enabled ? 'Activado' : 'Pausado'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Motor de automatización"
              className="au-switch"
              disabled={saving}
              onClick={() => (enabled && active.length > 0 ? setConfirmOff(true) : void setEnabled(!enabled))}
            >
              <span className="au-switch-knob" />
            </button>
          </div>
        )}
      </div>
      {confirmOff && (
        <Dialog
          title="¿Pausar toda la automatización?"
          titleId="st-engine-off"
          size="sm"
          onClose={() => setConfirmOff(false)}
          footer={(close) => (
            <>
              <button type="button" className="au-btn au-btn--ghost" onClick={close}>Cancelar</button>
              <button
                type="button"
                className="au-btn au-btn--danger"
                data-autofocus
                onClick={() => {
                  setConfirmOff(false);
                  void setEnabled(false);
                }}
              >
                {saving ? <Loader2 size={14} className="au-spin" /> : null} Pausar todo
              </button>
            </>
          )}
        >
          <p className="ad-lead">{impact}</p>
          <p className="st-card-text">Los eventos que ocurran mientras esté pausado no se ejecutarán más tarde. Puedes reactivarlo cuando quieras.</p>
        </Dialog>
      )}
    </div>
  );
}
