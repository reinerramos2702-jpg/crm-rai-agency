'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  LayoutDashboard,
  BookOpen,
  Plus,
  Loader2,
  Users,
  Zap,
  Calendar,
  Clock,
  MessageSquare,
  TrendingUp,
  Star,
  Copy,
  Trash2,
  Phone,
  MoreVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TOP_TABS = [
  { id: 'tablero', label: 'Tablero', icon: LayoutDashboard },
  { id: 'agentes', label: 'Lista de agentes', icon: Bot },
] as const;

type TopTab = (typeof TOP_TABS)[number]['id'];

interface AgentT {
  id: string;
  name: string;
  status: string;
  isPrimary: boolean;
  kind: string;
  channels: string[];
  llmProvider: string;
  llmModel: string;
  updatedAt: string;
  createdAt: string;
  _count?: { conversations: number; triggers: number };
}

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
  conversations: {
    id: string;
    contact: { id: string; name: string; email: string | null; phone: string | null; avatarUrl: string | null };
    channel: string;
    status: string;
    agent: { id: string; name: string; kind: string } | null;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    messageCount: number;
    aiMessageCount: number;
  }[];
  agents: { id: string; name: string; kind: string; status: string; isPrimary: boolean; avgSecondsPerMessage: number }[];
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  suggested: 'badge-gold',
  disabled: 'badge-muted',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  suggested: 'Sugerido',
  disabled: 'Apagado',
};

const CHANNEL_LABEL: Record<string, string> = {
  'Widget de chat (SMS chat)': 'Chat web',
  'Chat en tiempo real': 'Live chat',
  'Llamadas de voz': 'Llamadas',
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

function fmtMinutes(min: number) {
  if (min < 60) return `${min.toFixed(1)} min`;
  const hrs = Math.floor(min / 60);
  const rem = Math.round(min % 60);
  return `${hrs} h ${rem} min`;
}

// ============================================================
// Mini gráfico de línea en SVG puro (sin dependencias externas)
// ============================================================
function LineChart({ data }: { data: { date: string; contacts: number }[] }) {
  const W = 100;
  const H = 32;
  const max = Math.max(1, ...data.map((d) => d.contacts));
  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * W : 0;
    const y = H - (d.contacts / max) * H;
    return `${x},${y}`;
  });
  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 140 }}>
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--rai-gold)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--rai-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lc-fill)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--rai-gold)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="row-between muted" style={{ fontSize: 11, marginTop: 4 }}>
        <span>{data[0] ? new Date(data[0].date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : ''}</span>
        <span>{data[data.length - 1] ? new Date(data[data.length - 1].date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : ''}</span>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="card">
      <div className="row" style={{ gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `rgba(201,168,76,0.1)`,
            color: color || 'var(--rai-gold)',
          }}
        >
          <Icon size={16} />
        </div>
        <span className="label">{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

export default function AgentesIAPage() {
  const [topTab, setTopTab] = useState<TopTab>('tablero');

  // ---- Tablero ----
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [agentFilter, setAgentFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState('30');

  // ---- Lista de agentes ----
  const [agents, setAgents] = useState<AgentT[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  async function fetchDashboard() {
    setLoadingDashboard(true);
    try {
      const params = new URLSearchParams();
      params.set('agentId', agentFilter);
      params.set('days', daysFilter);
      const res = await fetch(`/api/ai-agents/dashboard?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      } else {
        toast.error('Error al cargar el tablero.');
      }
    } catch {
      toast.error('Error de red al cargar el tablero.');
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function fetchAgents() {
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/ai-agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      } else {
        toast.error('Error al cargar los agentes.');
      }
    } catch {
      toast.error('Error de red al cargar los agentes.');
    } finally {
      setLoadingAgents(false);
    }
  }

  useEffect(() => {
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (topTab === 'tablero') fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTab, agentFilter, daysFilter]);

  async function createAgent(kind: 'chat' | 'voice') {
    setCreating(true);
    try {
      const res = await fetch('/api/ai-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Agente creado.');
        window.location.href = `/agentes-ia/${data.agent.id}`;
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setCreating(false);
    }
  }

  async function setPrimary(agent: AgentT) {
    setBusyId(agent.id);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/ai-agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });
      if (res.ok) {
        toast.success(`"${agent.name}" es ahora el agente principal.`);
        fetchAgents();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(agent: AgentT) {
    const next = agent.status === 'active' ? 'disabled' : 'active';
    setBusyId(agent.id);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/ai-agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        toast.success(next === 'active' ? 'Agente activado.' : 'Agente apagado.');
        fetchAgents();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateAgent(agent: AgentT) {
    setBusyId(agent.id);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/ai-agents/${agent.id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        toast.success('Agente duplicado.');
        fetchAgents();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAgent(agent: AgentT) {
    if (!confirm(`¿Eliminar el agente "${agent.name}"? Esta acción no se puede deshacer.`)) return;
    setBusyId(agent.id);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/ai-agents/${agent.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Agente eliminado.');
        fetchAgents();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setBusyId(null);
    }
  }

  const m = dashboard?.metrics;

  return (
    <div className="container">
      <div className="mb-6 row-between">
        <div>
          <h1 className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bot size={24} color="var(--rai-gold)" /> Agentes de IA
          </h1>
          <p className="muted">
            Centraliza tus chatbots y agentes de voz: entrenamiento, personalidad, bases de conocimiento y métricas
            de desempeño, todo en un solo lugar.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/agentes-ia/base-conocimiento">
            <button className="secondary">
              <BookOpen size={14} /> Base de conocimiento
            </button>
          </Link>
          <button className="primary" onClick={() => createAgent('chat')} disabled={creating}>
            {creating ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Nuevo agente
          </button>
        </div>
      </div>

      {/* Top tabs */}
      <div className="row mb-6" style={{ gap: 8, borderBottom: '1px solid var(--rai-border)', paddingBottom: 0 }}>
        {TOP_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = topTab === tab.id;
          return (
            <button
              key={tab.id}
              className="ghost"
              onClick={() => setTopTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid var(--rai-border)',
                borderBottom: active ? '3px solid var(--rai-gold)' : '1px solid var(--rai-border)',
                color: active ? 'var(--rai-gold)' : 'var(--rai-muted)',
                fontWeight: active ? 600 : 400,
                background: active ? 'var(--rai-card)' : 'transparent',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===================== TAB: TABLERO ===================== */}
      {topTab === 'tablero' && (
        <div>
          <div className="row mb-4" style={{ gap: 8 }}>
            <select className="input" style={{ width: 240 }} value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
              <option value="all">Todos los agentes</option>
              {(dashboard?.agents || agents).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select className="input" style={{ width: 160 }} value={daysFilter} onChange={(e) => setDaysFilter(e.target.value)}>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>
          </div>

          {loadingDashboard ? (
            <div className="row" style={{ justifyContent: 'center', padding: 40 }}>
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : !dashboard ? (
            <p className="muted">No se pudo cargar el tablero.</p>
          ) : (
            <>
              <div className="grid grid-4 mb-6">
                <MetricCard icon={Users} label="Total contactos únicos" value={m!.totalContacts} />
                <MetricCard icon={Zap} label="Total acciones activadas" value={m!.totalActions} />
                <MetricCard icon={Calendar} label="Total cita reservada" value={m!.totalAppointments} />
                <MetricCard icon={Clock} label="Tiempo ahorrado" value={fmtMinutes(m!.timeSavedMinutes)} />
              </div>

              <div className="grid mb-6" style={{ gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
                <div className="card">
                  <div className="card-header">
                    <span style={{ fontWeight: 600 }}>Contactos únicos por día</span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Últimos {dashboard.range.days} días
                    </span>
                  </div>
                  {dashboard.chart.every((d) => d.contacts === 0) ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <TrendingUp size={28} className="muted" style={{ marginBottom: 8 }} />
                      <p className="muted">Aún no hay actividad de agentes de IA en este periodo.</p>
                    </div>
                  ) : (
                    <LineChart data={dashboard.chart} />
                  )}
                </div>

                <div className="grid" style={{ gap: 16 }}>
                  <MetricCard icon={MessageSquare} label="Mensaje total" value={m!.totalMessages} />
                  <MetricCard icon={TrendingUp} label="Promedio de mensajes por contacto" value={m!.avgMessagesPerContact} />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 600 }}>Conversaciones recientes atendidas por IA</span>
                </div>
                {dashboard.conversations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <MessageSquare size={28} className="muted" style={{ marginBottom: 8 }} />
                    <p className="muted">Aún no hay conversaciones atendidas por agentes de IA.</p>
                  </div>
                ) : (
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Contacto</th>
                        <th>Agente</th>
                        <th>Canal</th>
                        <th>Último mensaje</th>
                        <th>Mensajes IA</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.conversations.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.contact.name}</td>
                          <td className="muted" style={{ fontSize: 13 }}>{c.agent?.name || '—'}</td>
                          <td className="muted" style={{ fontSize: 13 }}>{c.channel}</td>
                          <td className="muted truncate" style={{ fontSize: 13, maxWidth: 280 }}>
                            {c.lastMessagePreview || '—'}
                          </td>
                          <td>{c.aiMessageCount}</td>
                          <td>
                            <span className={c.status === 'open' ? 'badge-success' : c.status === 'pending' ? 'badge-warning' : 'badge-muted'}>
                              {c.status}
                            </span>
                          </td>
                          <td className="muted" style={{ fontSize: 13 }}>{fmtDate(c.lastMessageAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================== TAB: LISTA DE AGENTES ===================== */}
      {topTab === 'agentes' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>Lista de agentes</span>
            <div className="row" style={{ gap: 8 }}>
              <button className="secondary" onClick={() => createAgent('voice')} disabled={creating}>
                {creating ? <Loader2 className="animate-spin" size={14} /> : <Phone size={14} />} Nuevo agente de voz
              </button>
              <button className="primary" onClick={() => createAgent('chat')} disabled={creating}>
                {creating ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Nuevo agente
              </button>
            </div>
          </div>

          {loadingAgents ? (
            <div className="row" style={{ justifyContent: 'center', padding: 20 }}>
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : agents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Bot size={32} className="muted" style={{ marginBottom: 8 }} />
              <p className="muted">Aún no tienes agentes de IA configurados.</p>
              <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <button className="primary" onClick={() => createAgent('chat')} disabled={creating}>
                  <Plus size={14} /> Crear agente de chat
                </button>
                <button className="secondary" onClick={() => createAgent('voice')} disabled={creating}>
                  <Phone size={14} /> Crear agente de voz
                </button>
              </div>
            </div>
          ) : (
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Tipo</th>
                  <th>Canales</th>
                  <th>Modelo</th>
                  <th>Conversaciones</th>
                  <th>Estado</th>
                  <th>Última actualización</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/agentes-ia/${a.id}`} style={{ fontWeight: 600, color: 'var(--rai-text)', textDecoration: 'none' }}>
                        {a.name}
                      </Link>
                      {a.isPrimary && (
                        <span className="badge-gold" style={{ marginLeft: 8, fontSize: 10 }}>
                          <Star size={10} /> Principal
                        </span>
                      )}
                    </td>
                    <td className="muted" style={{ fontSize: 13 }}>
                      {a.kind === 'voice' ? (
                        <span className="row" style={{ gap: 4 }}><Phone size={12} /> Voz</span>
                      ) : (
                        <span className="row" style={{ gap: 4 }}><MessageSquare size={12} /> Chat</span>
                      )}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {a.channels.map((c) => CHANNEL_LABEL[c] || c).join(', ') || '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>{a.llmProvider} / {a.llmModel}</td>
                    <td>{a._count?.conversations ?? 0}</td>
                    <td>
                      <span className={STATUS_BADGE[a.status] || 'badge-muted'}>
                        {STATUS_LABEL[a.status] || a.status}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: 13 }}>{fmtDate(a.updatedAt)}</td>
                    <td style={{ position: 'relative' }}>
                      {busyId === a.id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <>
                          <button className="btn-sm btn-icon ghost" onClick={() => setMenuOpenId(menuOpenId === a.id ? null : a.id)}>
                            <MoreVertical size={14} />
                          </button>
                          {menuOpenId === a.id && (
                            <div
                              className="card"
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                zIndex: 10,
                                padding: 6,
                                minWidth: 200,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                              }}
                            >
                              {!a.isPrimary && (
                                <button className="ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => setPrimary(a)}>
                                  <Star size={13} /> Marcar como principal
                                </button>
                              )}
                              <button className="ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => toggleStatus(a)}>
                                <Zap size={13} /> {a.status === 'active' ? 'Apagar agente' : 'Activar agente'}
                              </button>
                              <button className="ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => duplicateAgent(a)}>
                                <Copy size={13} /> Duplicar
                              </button>
                              <button className="danger btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => deleteAgent(a)}>
                                <Trash2 size={13} /> Eliminar
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
