'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Activity, DollarSign, Cpu } from 'lucide-react';

interface AgentEvent {
  type: string;
  agentName?: string;
  taskId?: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

interface AgentMonitorProps {
  campaignId: string;
  executionId?: string;
}

/**
 * Monitor SSE en vivo de agentes de IA.
 * Feed de eventos en tiempo real con indicadores de agentes activos.
 */
export function AgentMonitor({ campaignId, executionId }: AgentMonitorProps) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());
  const [totalCost, setTotalCost] = useState(0);
  const [connected, setConnected] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!executionId) return;

    const es = new EventSource(`/api/events/${campaignId}?executionId=${executionId}`);

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AgentEvent & { timestamp?: string };
        const enriched = { ...event, timestamp: new Date().toISOString() };
        setEvents((prev) => [...prev.slice(-100), enriched]); // máximo 100 eventos en memoria

        // Actualizar agentes activos
        if (event.type === 'agent.started' && event.agentName) {
          setActiveAgents((prev) => new Set([...prev, event.agentName!]));
        }
        if (['task.completed', 'execution.paused'].includes(event.type)) {
          setActiveAgents(new Set());
        }
        if (event.type === 'task.completed') {
          const cost = (event.payload?.totalCost as number) || 0;
          setTotalCost((prev) => prev + cost);
        }
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [campaignId, executionId]);

  // Auto-scroll al final del log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const AGENT_LABELS: Record<string, string> = {
    copy: 'Copy Agent',
    visual: 'Visual Agent',
    audio: 'Audio Agent',
    video: 'Video Agent',
    music: 'Music Agent',
  };

  function getEventColor(type: string): string {
    if (type === 'agent.started') return 'var(--rai-purple)';
    if (type === 'asset.ready') return 'var(--rai-success)';
    if (type === 'task.completed') return 'var(--rai-gold)';
    if (type === 'execution.paused') return 'var(--rai-error)';
    return 'var(--rai-muted)';
  }

  function formatEvent(event: AgentEvent): string {
    const time = new Date(event.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (event.type === 'agent.started') return `[${time}] 🚀 ${AGENT_LABELS[event.agentName || ''] || event.agentName} iniciado`;
    if (event.type === 'asset.ready') return `[${time}] ✅ Asset listo: ${(event.payload as Record<string, string>)?.kind || 'asset'}`;
    if (event.type === 'task.completed') return `[${time}] 🏁 Tarea completada · Costo: $${((event.payload as Record<string, number>)?.totalCost || 0).toFixed(4)}`;
    if (event.type === 'execution.paused') return `[${time}] ⏸ Ejecución pausada en ${event.agentName}`;
    return `[${time}] ${event.type}`;
  }

  return (
    <div
      style={{
        background: 'var(--rai-dark)',
        border: '1px solid var(--rai-border)',
        borderRadius: 12,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--rai-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={14} color="var(--rai-gold)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--rai-text)' }}>
            Monitor IA
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: connected ? 'var(--rai-success)' : 'var(--rai-muted)',
              animation: connected ? 'pulse-purple 2s infinite' : 'none',
            }}
          />
          <span style={{ fontSize: 11, color: connected ? 'var(--rai-success)' : 'var(--rai-muted)' }}>
            {connected ? 'En vivo' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Agentes activos */}
      {activeAgents.size > 0 && (
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--rai-border)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {Array.from(activeAgents).map((agent) => (
            <div
              key={agent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                background: 'rgba(123,94,167,0.15)',
                border: '1px solid rgba(123,94,167,0.3)',
                borderRadius: 100,
                fontSize: 11,
                color: 'var(--rai-purple)',
              }}
            >
              <span
                className="status-dot running"
                style={{ width: 6, height: 6 }}
              />
              <Cpu size={10} />
              {AGENT_LABELS[agent] || agent}
            </div>
          ))}
        </div>
      )}

      {/* Log de terminal */}
      <div
        ref={logRef}
        className="terminal"
        style={{ flex: 1, margin: 0, borderRadius: 0, border: 'none', maxHeight: 'none' }}
      >
        {events.length === 0 ? (
          <p style={{ color: 'var(--rai-muted)', fontSize: 11 }}>
            {executionId
              ? '> Esperando eventos del pipeline...'
              : '> Inicia una ejecución para ver eventos en tiempo real.'}
          </p>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              className="terminal-line"
              style={{ color: getEventColor(event.type), fontSize: 11 }}
            >
              {formatEvent(event)}
            </div>
          ))
        )}
      </div>

      {/* Contador de costo */}
      {totalCost > 0 && (
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--rai-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <DollarSign size={12} color="var(--rai-gold)" />
          <span style={{ fontSize: 12, color: 'var(--rai-muted)' }}>Costo acumulado:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rai-gold)' }}>
            ${totalCost.toFixed(4)} USD
          </span>
        </div>
      )}
    </div>
  );
}
