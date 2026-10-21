'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldCheck } from 'lucide-react';
import { summarizeRisks, type RiskLevel } from '@/lib/automation-safety';
import type { SettingsT, WorkflowT } from '../types';
import { useAutomationPrefs } from '../use-automation-prefs';

const LEVEL_ICON: Record<RiskLevel, typeof Info> = { high: AlertTriangle, medium: AlertTriangle, info: Info };

interface SafetyCardProps {
  settings: SettingsT | null;
  workflows: WorkflowT[];
}

/** Seguridad sin tocar el servidor: confirmación antes de activar flujos que escriben a clientes y resumen de riesgos actuales. */
export function SafetyCard({ settings, workflows }: SafetyCardProps) {
  const { prefs, update } = useAutomationPrefs();
  const risks = settings
    ? summarizeRisks(workflows.filter((w) => !w.id.startsWith('tmp-')), {
        automationsEnabled: settings.automationsEnabled,
        webhookConfigured: !!settings.n8nWebhookUrl,
        hasNotifyEmail: !!settings.automationNotifyEmail,
      })
    : null;

  return (
    <div className="au-st-card">
      <h3 className="st-card-title"><ShieldCheck size={16} /> Seguridad de los envíos</h3>
      <p className="st-card-text">Un flujo con «Enviar notificación» escribe a clientes reales. Estas protecciones evitan activarlo por error.</p>
      <div className="st-prefs">
        <div className="st-pref">
          <div className="st-pref-text">
            <strong>Confirmar antes de activar flujos que envían mensajes</strong>
            <span>Muestra un resumen (canales, riesgo de repetición, estado de n8n) y pide un «Sí, activar». Se guarda en este navegador.</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.confirmSend}
            aria-label="Confirmar antes de activar flujos que envían mensajes"
            className="au-switch"
            onClick={() => update({ confirmSend: !prefs.confirmSend })}
          >
            <span className="au-switch-knob" />
          </button>
        </div>
      </div>
      <h4 className="st-subtitle">Revisión de riesgos ahora mismo</h4>
      {risks === null ? (
        <p className="st-card-text">Revisando…</p>
      ) : risks.length === 0 ? (
        <p className="st-ok"><CheckCircle2 size={15} aria-hidden="true" /> Todo en orden: no hay riesgos que revisar.</p>
      ) : (
        <ul className="st-risks">
          {risks.map((risk) => {
            const Icon = LEVEL_ICON[risk.level];
            return (
              <li key={risk.id} className={`st-risk st-risk--${risk.level}`}>
                <Icon size={15} aria-hidden="true" />
                <span>{risk.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
