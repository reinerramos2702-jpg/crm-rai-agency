'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, FileText, Hash, PhoneForwarded, PhoneCall, ScrollText } from 'lucide-react';
import {
  languageLabel, parseVoiceLocalConfig, speedLabel, toneLabel, voiceConfigKey, voiceLabel, type VoiceLocalConfig,
} from '@/lib/agent-wizard';

const PENDING = [
  { icon: Hash, title: 'Número de teléfono', text: 'Asignar o portar el número que recibirá las llamadas (SIP / proveedor de telefonía).' },
  { icon: ScrollText, title: 'Transcripciones', text: 'Texto completo de cada llamada, consultable desde el CRM.' },
  { icon: FileText, title: 'Resumen post-llamada', text: 'Resumen, intención y datos del llamante enviados al contacto.' },
  { icon: PhoneForwarded, title: 'Transferencia a humano', text: 'Pasar la llamada en vivo a una persona del equipo.' },
  { icon: BarChart3, title: 'Métricas de llamadas', text: 'Volumen, duración, resolución y llamadas perdidas en el tablero.' },
] as const;

/** Qué falta para que el agente de voz conteste llamadas reales. */
export function VoiceComingSoon() {
  return (
    <section className="card ag-soon" aria-labelledby="ag-soon-title">
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <PhoneCall size={16} color="var(--ag-voice)" aria-hidden="true" />
        <h2 id="ag-soon-title" style={{ fontSize: 16, margin: 0 }}>Llamadas reales</h2>
        <span className="ag-pill">Próximamente</span>
      </div>
      <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
        La telefonía real (número, SIP) se conecta en una fase posterior. Hoy puedes configurar el agente y probarlo con el simulador de texto.
      </p>
      <ul className="ag-soon-list">
        {PENDING.map(({ icon: Icon, title, text }) => (
          <li key={title} className="ag-soon-item">
            <Icon size={15} aria-hidden="true" />
            <span><strong>{title}</strong><br /><span className="muted">{text}</span></span>
          </li>
        ))}
      </ul>
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
        Se aplicará a las llamadas cuando se conecte la telefonía.
      </p>
    </div>
  );
}
