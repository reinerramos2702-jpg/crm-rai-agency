'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CHAT_CHANNEL_OPTIONS, VOICE_CHANNEL_OPTIONS, type AgentDetail } from './agent-types';

export function ConfigTab({
  agent,
  setAgent,
  patchAgent,
  saving,
}: {
  agent: AgentDetail;
  setAgent: React.Dispatch<React.SetStateAction<AgentDetail | null>>;
  patchAgent: (data: Record<string, unknown>, msg?: string) => Promise<void>;
  saving: boolean;
}) {
  const [name, setName] = useState(agent.name);
  const [channels, setChannels] = useState<string[]>(agent.channels);
  const [avgSeconds, setAvgSeconds] = useState(agent.avgSecondsPerMessage);

  const channelOptions = agent.kind === 'voice' ? VOICE_CHANNEL_OPTIONS : CHAT_CHANNEL_OPTIONS;

  function toggleChannel(ch: string) {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  }

  async function save() {
    await patchAgent({ name: name.trim() || agent.name, channels, avgSecondsPerMessage: avgSeconds }, 'Configuración guardada.');
    setAgent((prev) => (prev ? { ...prev, name: name.trim() || prev.name, channels, avgSecondsPerMessage: avgSeconds } : prev));
  }

  const dirty = name !== agent.name || JSON.stringify(channels) !== JSON.stringify(agent.channels) || avgSeconds !== agent.avgSecondsPerMessage;

  return (
    <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
      <div className="card">
        <div className="card-header">
          <span style={{ fontWeight: 600 }}>Identidad del bot</span>
        </div>
        <div className="form-group">
          <label>Nombre del agente</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Tipo de agente</label>
          <input className="input" value={agent.kind === 'voice' ? 'Agente de voz' : 'Agente de chat'} disabled />
        </div>
        <div className="form-group">
          <label>Canales activos</label>
          <div className="grid grid-2" style={{ gap: 8 }}>
            {channelOptions.map((ch) => (
              <label
                key={ch}
                className="row"
                style={{
                  gap: 8,
                  padding: '8px 12px',
                  border: '1px solid var(--rai-border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: channels.includes(ch) ? 'rgba(201,168,76,0.08)' : 'transparent',
                  textTransform: 'none',
                  fontSize: 13,
                  fontWeight: 400,
                  margin: 0,
                }}
              >
                <input type="checkbox" checked={channels.includes(ch)} onChange={() => toggleChannel(ch)} style={{ width: 'auto' }} />
                {ch}
              </label>
            ))}
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="primary" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>Tiempo ahorrado</span>
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Segundos que tu equipo tardaría en escribir manualmente cada respuesta. Se usa para calcular el "tiempo
            ahorrado" en el tablero.
          </p>
          <div className="form-group">
            <label>Segundos por mensaje</label>
            <input
              className="input"
              type="number"
              min={1}
              value={avgSeconds}
              onChange={(e) => setAvgSeconds(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <button className="secondary w-full" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : 'Guardar'}
          </button>
        </div>

        <div className="card" style={{ background: 'rgba(136,136,170,0.05)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Estado</div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
            {agent.status === 'active'
              ? 'Este agente está activo y responderá automáticamente en sus canales.'
              : agent.status === 'suggested'
              ? 'Este agente es un borrador sugerido. Actívalo cuando esté listo.'
              : 'Este agente está apagado y no responderá conversaciones.'}
          </p>
        </div>
      </div>
    </div>
  );
}
