'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, Copy, Loader2, PhoneCall, Rocket, Save, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateVoiceSettings, type VoiceSettings } from '@/lib/voice/settings';
import type { StepState } from '@/lib/voice/status';
import type { SyncResponse, VoiceAgentRow, VoiceStatusResponse } from './types';

const STATE_LABEL: Record<StepState, string> = { ok: 'Listo', todo: 'Pendiente', manual: 'Manual' };
const STATE_DOT: Record<StepState, string> = { ok: 'fx-dot--ok', todo: 'fx-dot--warn', manual: '' };

interface Props {
  status: VoiceStatusResponse;
  agent: VoiceAgentRow | null;
  settings: VoiceSettings;
  /** Guarda los ajustes en este navegador; devuelve false si no se pudo. */
  onSaveSettings: (s: VoiceSettings) => boolean;
}

/** Activación en cuatro pasos: llaves → número → webhook → prueba, y el botón de activar. */
export function ActivationCard({ status, agent, settings, onSaveSettings }: Props) {
  const live = status.mode === 'live';
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(null);

  const copyWebhook = async () => {
    if (!status.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(status.webhookUrl);
      toast.success('URL copiada.');
    } catch {
      toast.error('No se pudo copiar; selecciónala manualmente.');
    }
  };

  const run = async () => {
    if (!agent) return;
    const valid = validateVoiceSettings(settings);
    if (!valid.ok) {
      toast.error(`Revisa los ajustes de voz: ${valid.errors[0].message}`);
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const saved = onSaveSettings(valid.data);
      const res = await fetch('/api/voice/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, settings: valid.data }),
      });
      const data: SyncResponse = await res.json().catch(() => ({ mode: status.mode, synced: false, preview: null, error: `Error del servidor (${res.status})` }));
      setResult(data);
      if (!res.ok) toast.error(data.error ?? 'No se pudo activar.');
      else if (data.synced) toast.success('Agente activado en Retell.');
      else toast.success(saved ? 'Guardado en modo simulado.' : 'Validado, pero este navegador no permitió guardar los ajustes.');
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setBusy(false);
    }
  };

  const issues = result?.issues ?? [];
  const errorLines = (result?.errors ?? []).map((e) => (typeof e === 'string' ? e : e.message));

  return (
    <section className="card vz-card" aria-labelledby="vz-act-title">
      <div className="vz-card-head">
        <h2 id="vz-act-title" className="vz-h2"><Rocket size={16} color="var(--ag-voice)" aria-hidden="true" /> Activación</h2>
        <span className={`vz-badge ${live ? 'vz-badge--live' : ''}`}>
          <span className={`fx-dot ${live ? 'fx-dot--live' : ''}`} aria-hidden="true" /> {live ? 'En vivo' : 'Modo simulado · cero gasto'}
        </span>
      </div>

      <ol className="vz-steps" aria-label="Pasos de activación">
        {status.steps.map((s, i) => (
          <li key={s.id} className="vz-step" data-state={s.state}>
            <span className="vz-step-num" aria-hidden="true">{s.state === 'ok' ? <CheckCircle2 size={16} /> : <Circle size={16} />}</span>
            <span className="vz-step-text">
              <strong>{i + 1}. {s.label}</strong>
              <span className="vz-step-state"><span className={`fx-dot ${STATE_DOT[s.state]}`} aria-hidden="true" /> {STATE_LABEL[s.state]}</span>
            </span>
          </li>
        ))}
      </ol>

      {status.missingEnv.length > 0 && (
        <div className="vz-missing">
          <span className="muted" style={{ fontSize: 13 }}>Variables de entorno por configurar:</span>
          <div className="vz-chips">{status.missingEnv.map((m) => <code key={m} className="vz-chip">{m}</code>)}</div>
        </div>
      )}

      {status.webhookUrl && (
        <div className="vz-webhook">
          <span className="muted" style={{ fontSize: 13 }}>URL base del webhook (cada agente usa su propia URL con <code>?agent=</code>, se registra sola al activar)</span>
          <div className="vz-copy">
            <code className="vz-url">{status.webhookUrl}</code>
            <button type="button" className="ag-btn ag-btn--ghost" style={{ minHeight: 34, padding: '0 10px' }} onClick={copyWebhook} aria-label="Copiar URL del webhook">
              <Copy size={13} aria-hidden="true" /> Copiar
            </button>
          </div>
        </div>
      )}

      <details className="vz-details">
        <summary>Ver detalle de la lista de verificación</summary>
        <ul className="vz-checklist">
          {status.items.map((i) => (
            <li key={i.id}>
              <span className={`fx-dot ${STATE_DOT[i.state]}`} role="img" aria-label={STATE_LABEL[i.state]} />
              <span><strong>{i.label}</strong><br /><span className="muted">{i.detail}</span></span>
            </li>
          ))}
        </ul>
      </details>

      <div className="vz-actions">
        {!agent ? (
          <span className="muted" style={{ fontSize: 13 }}>Crea un agente de voz para poder activarlo.</span>
        ) : (
          <button
            type="button"
            className="ag-btn ag-btn--accent"
            onClick={run}
            disabled={busy || (live && !status.envReady)}
            title={live && !status.envReady ? 'Completa las variables de entorno pendientes.' : undefined}
          >
            {busy ? <Loader2 className="animate-spin" size={14} aria-hidden="true" /> : live ? <PhoneCall size={14} aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
            {live ? 'Activar con Retell' : 'Guardar en modo simulado'}
          </button>
        )}
        {!live && <span className="muted" style={{ fontSize: 12 }}>Valida la configuración y la guarda en este navegador; no se contacta a ningún proveedor.</span>}
      </div>

      {result && (
        <div className="vz-result" role="status">
          {result.synced && <p><CheckCircle2 size={14} color="var(--rai-success)" aria-hidden="true" /> Agente creado o actualizado en el proveedor ({result.providerAgentId}).</p>}
          {result.error && <p className="vz-err">{result.error}</p>}
          {[...issues, ...errorLines].map((m) => <p key={m} className="vz-warn"><Wrench size={13} aria-hidden="true" /> {m}</p>)}
          {result.preview && (
            <dl className="vz-preview">
              <div><dt>Saludo</dt><dd>{result.preview.beginMessage}</dd></div>
              <div><dt>Herramientas</dt><dd>{result.preview.tools.join(', ')}</dd></div>
              <div><dt>Idioma / ritmo</dt><dd>{result.preview.language} · x{result.preview.voiceSpeed}</dd></div>
              <div><dt>Límite</dt><dd>{result.preview.maxCallMinutes} min por llamada</dd></div>
            </dl>
          )}
        </div>
      )}
    </section>
  );
}
