'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, PhoneCall } from 'lucide-react';
import {
  languageLabel, parseVoiceLocalConfig, speedLabel, toneLabel, voiceConfigKey, voiceLabel, type VoiceLocalConfig,
} from '@/lib/agent-wizard';
import { useCachedJson } from '@/lib/use-cached-json';
import type { VoiceStatusResponse } from '../voz/_components/types';
import { VOICE_CENTER_HREF } from './NewAgentButtons';

const STATE_LABEL = { ok: 'Listo', todo: 'Pendiente', manual: 'Manual' } as const;
const STATE_DOT = { ok: 'fx-dot--ok', todo: 'fx-dot--warn', manual: '' } as const;

/** Estado real de las llamadas: modo, pasos de activación y acceso al Centro de voz. */
export function VoiceStatusCard() {
  const { data, error } = useCachedJson<VoiceStatusResponse>('/api/voice/status', { ttlMs: 20_000 });
  const live = data?.mode === 'live';
  return (
    <section className="card ag-soon" aria-labelledby="ag-voice-status-title">
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <PhoneCall size={16} color="var(--ag-voice)" aria-hidden="true" />
        <h2 id="ag-voice-status-title" style={{ fontSize: 16, margin: 0 }}>Llamadas reales</h2>
        <span className="ag-pill">{data ? (live ? 'En vivo' : 'Modo simulado') : error ? 'Sin estado' : 'Cargando…'}</span>
      </div>
      <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
        {live
          ? 'El proveedor de voz está activo. Revisa llamadas, uso y tope de gasto en el Centro de voz.'
          : 'Por ahora el agente se prueba con el simulador de texto, sin costo. La telefonía real se activa desde el Centro de voz cuando estén las llaves y el número.'}
      </p>
      {data && (
        <ul className="ag-soon-list">
          {data.steps.map((s, i) => (
            <li key={s.id} className="ag-soon-item">
              <span className={`fx-dot ${STATE_DOT[s.state]}`} role="img" aria-label={STATE_LABEL[s.state]} style={{ marginTop: 6 }} />
              <span><strong>{i + 1}. {s.label}</strong><br /><span className="muted">{STATE_LABEL[s.state]}</span></span>
            </li>
          ))}
        </ul>
      )}
      <Link href={VOICE_CENTER_HREF} className="ag-btn ag-btn--voice" style={{ marginTop: 12 }}>
        Abrir Centro de voz <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}

/** Configuración de voz guardada en este navegador al crear el agente (el modelo aún no tiene esos campos). */
export function VoiceLocalSummary({ agentId }: { agentId: string }) {
  const [cfg, setCfg] = useState<VoiceLocalConfig | null>(null);
  useEffect(() => {
    try {
      setCfg(parseVoiceLocalConfig(window.localStorage.getItem(voiceConfigKey(agentId))));
    } catch {
      setCfg(null);
    }
  }, [agentId]);

  if (!cfg) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <strong>Configuración de voz</strong>
        <span className="ag-pill">Solo en este navegador</span>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        {voiceLabel(cfg.voiceId)} · {languageLabel(cfg.language)} · ritmo {speedLabel(cfg.speed).toLowerCase()} · tono {toneLabel(cfg.tone).toLowerCase()}.
        Los ajustes generales de llamada (horario, transferencia, tope) se editan en el Centro de voz.
      </p>
    </div>
  );
}
