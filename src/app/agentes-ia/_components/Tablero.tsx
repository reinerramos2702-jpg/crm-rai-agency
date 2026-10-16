'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Users, Zap, Calendar, Clock, MessageSquare, TrendingUp, RotateCcw } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton';
import { LineChart } from './LineChart';
import { ConversationsTable, type DashboardConversation } from './ConversationsTable';
import { fmtMinutes } from './format';

interface DashboardData {
  range: { since: string; days: number };
  metrics: {
    totalContacts: number;
    totalActions: number;
    totalMessages: number;
    totalAppointments: number;
    timeSavedMinutes: number;
    avgMessagesPerContact: number;
  };
  chart: { date: string; contacts: number }[];
  conversations: DashboardConversation[];
  agents: { id: string; name: string }[];
}

interface KpiProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  syncing: boolean;
}

function Kpi({ icon: Icon, label, value, syncing }: KpiProps) {
  return (
    <div className={`card fx-sync${syncing ? ' is-syncing' : ''}`}>
      <div className="ag-kpi-top">
        <div className="ag-kpi-icon" aria-hidden="true"><Icon size={16} /></div>
        <span className="label">{label}</span>
      </div>
      <div className="ag-kpi-value">{value}</div>
    </div>
  );
}

function TableroSkeleton() {
  return (
    <div aria-busy="true">
      <span className="fx-sr-only" role="status">Cargando el tablero…</span>
      <div className="ag-kpis">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} lines={2} />)}
      </div>
      <div className="ag-split">
        <SkeletonCard lines={5} />
        <div className="ag-stack"><SkeletonCard lines={2} /><SkeletonCard lines={2} /></div>
      </div>
      <div className="card" style={{ display: 'grid', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <SkeletonLine key={i} height={16} width={i % 2 ? '88%' : '100%'} />)}
      </div>
    </div>
  );
}

/** Pulso breve cuando llegan datos nuevos por detrás (no en la primera carga). */
function useSyncPulse(data: unknown): boolean {
  const [syncing, setSyncing] = useState(false);
  const seen = useRef(false);
  useEffect(() => {
    if (data === undefined) return;
    if (!seen.current) {
      seen.current = true;
      return;
    }
    setSyncing(false);
    const raf = requestAnimationFrame(() => setSyncing(true));
    const t = setTimeout(() => setSyncing(false), 1200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [data]);
  return syncing;
}

export function Tablero({ fallbackAgents }: { fallbackAgents: { id: string; name: string }[] }) {
  const [agentFilter, setAgentFilter] = useState('all');
  const [days, setDays] = useState('30');
  const url = `/api/ai-agents/dashboard?agentId=${encodeURIComponent(agentFilter)}&days=${days}`;
  const { data, error, loading, refresh } = useCachedJson<DashboardData>(url, { ttlMs: 30_000 });
  const syncing = useSyncPulse(data);
  const m = data?.metrics;
  const options = data?.agents ?? fallbackAgents;

  return (
    <div>
      <div className="ag-filters">
        <select className="input" aria-label="Filtrar por agente" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="all">Todos los agentes</option>
          {options.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="input" aria-label="Rango de fechas" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
        </select>
      </div>

      {loading && <TableroSkeleton />}

      {!loading && !data && (
        <div className="card ag-empty-inline">
          <p>No se pudo cargar el tablero{error ? ` (${error})` : ''}.</p>
          <button className="ag-btn ag-btn--ghost" style={{ marginTop: 12 }} onClick={() => void refresh()}>
            <RotateCcw size={14} /> Reintentar
          </button>
        </div>
      )}

      {data && m && (
        <>
          <div className="ag-kpis">
            <Kpi icon={Users} label="Contactos únicos" value={m.totalContacts} syncing={syncing} />
            <Kpi icon={Zap} label="Acciones activadas" value={m.totalActions} syncing={syncing} />
            <Kpi icon={Calendar} label="Citas reservadas" value={m.totalAppointments} syncing={syncing} />
            <Kpi icon={Clock} label="Tiempo ahorrado" value={fmtMinutes(m.timeSavedMinutes)} syncing={syncing} />
          </div>

          <div className="ag-split">
            <div className={`card fx-sync${syncing ? ' is-syncing' : ''}`}>
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Contactos únicos por día</span>
                <span className="muted" style={{ fontSize: 12 }}>Últimos {data.range.days} días</span>
              </div>
              {data.chart.every((d) => d.contacts === 0) ? (
                <div className="ag-empty-inline">
                  <TrendingUp size={28} style={{ marginBottom: 8 }} />
                  <p>Aún no hay actividad de agentes de IA en este periodo.</p>
                </div>
              ) : (
                <LineChart data={data.chart} />
              )}
            </div>
            <div className="ag-stack">
              <Kpi icon={MessageSquare} label="Mensajes de la IA" value={m.totalMessages} syncing={syncing} />
              <Kpi icon={TrendingUp} label="Mensajes por contacto (promedio)" value={m.avgMessagesPerContact} syncing={syncing} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600 }}>Conversaciones recientes atendidas por IA</span>
            </div>
            <ConversationsTable rows={data.conversations} />
          </div>
        </>
      )}
    </div>
  );
}
