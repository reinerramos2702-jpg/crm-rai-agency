'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useChat } from 'ai/react';
import {
  Bot,
  ArrowLeft,
  Settings as SettingsIcon,
  BookOpen,
  Target,
  Loader2,
  Star,
  Phone,
  MessageSquare,
  Plus,
  Trash2,
  X,
  Send,
  RotateCcw,
  Sparkles,
  Calendar,
  Zap,
  ArrowRightLeft,
  ExternalLink,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

const LLM_PROVIDERS = [
  { provider: 'openai', label: 'GPT-4', models: [{ id: 'gpt-4o', label: 'GPT-4o' }, { id: 'gpt-4o-mini', label: 'GPT-4o mini' }] },
  { provider: 'anthropic', label: 'Claude', models: [{ id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' }, { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' }] },
  { provider: 'google', label: 'Gemini', models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }, { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }] },
  { provider: 'deepseek', label: 'DeepSeek', models: [{ id: 'deepseek-chat', label: 'DeepSeek Chat' }, { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }] },
] as const;

const SUB_TABS = [
  { id: 'config', label: 'Configuración del Bot', icon: SettingsIcon },
  { id: 'entrenamiento', label: 'Entrenamiento del bot', icon: BookOpen },
  { id: 'objetivos', label: 'Objetivos del bot', icon: Target },
] as const;

type SubTab = (typeof SUB_TABS)[number]['id'];

const CHAT_CHANNEL_OPTIONS = [
  'Widget de chat (SMS chat)',
  'Chat en tiempo real',
  'WhatsApp',
  'Instagram',
  'Email',
  'SMS',
];
const VOICE_CHANNEL_OPTIONS = ['Llamadas de voz'];

interface TriggerT {
  id: string;
  triggerCondition: string | null;
  knowledgeBase: { id: string; name: string; description: string | null; _count?: { items: number } };
}

interface AgentDetail {
  id: string;
  name: string;
  status: string;
  isPrimary: boolean;
  kind: string;
  channels: string[];
  llmProvider: string;
  llmModel: string;
  personality: string | null;
  objective: string | null;
  additionalInfo: string | null;
  welcomeMessage: string | null;
  fallbackMessage: string | null;
  avgSecondsPerMessage: number;
  createdAt: string;
  updatedAt: string;
  triggers: TriggerT[];
  _count?: { conversations: number };
}

interface KBSummary {
  id: string;
  name: string;
  description: string | null;
  _count?: { items: number; triggers: number };
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

export default function AgentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('config');
  const [saving, setSaving] = useState(false);

  const fetchAgent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai-agents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
      } else if (res.status === 404) {
        toast.error('Agente no encontrado.');
      } else {
        toast.error('Error al cargar el agente.');
      }
    } catch {
      toast.error('Error de red al cargar el agente.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  async function patchAgent(data: Record<string, unknown>, successMsg?: string) {
    if (!agent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ai-agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setAgent((prev) => (prev ? { ...prev, ...updated.agent } : prev));
        if (successMsg) toast.success(successMsg);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="row" style={{ justifyContent: 'center', padding: 60 }}>
          <Loader2 className="animate-spin" size={24} />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container">
        <p className="muted">Agente no encontrado.</p>
        <Link href="/agentes-ia"><button className="secondary mt-4"><ArrowLeft size={14} /> Volver</button></Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="mb-6">
        <Link href="/agentes-ia" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
          <ArrowLeft size={14} /> Agentes de IA
        </Link>
        <div className="row-between">
          <div>
            <h1 className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {agent.kind === 'voice' ? <Phone size={22} color="var(--rai-gold)" /> : <Bot size={22} color="var(--rai-gold)" />}
              {agent.name}
              {agent.isPrimary && (
                <span className="badge-gold" style={{ fontSize: 11 }}>
                  <Star size={11} /> Principal
                </span>
              )}
              <span className={STATUS_BADGE[agent.status] || 'badge-muted'}>{STATUS_LABEL[agent.status] || agent.status}</span>
            </h1>
            <p className="muted">
              {agent.kind === 'voice' ? 'Agente de voz' : 'Agente de chat'} · {agent._count?.conversations ?? 0} conversaciones ·{' '}
              {agent.llmProvider} / {agent.llmModel}
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {!agent.isPrimary && (
              <button className="secondary" onClick={() => patchAgent({ isPrimary: true }, `"${agent.name}" es ahora el agente principal.`)} disabled={saving}>
                <Star size={14} /> Marcar como principal
              </button>
            )}
            <button
              className={agent.status === 'active' ? 'danger' : 'primary'}
              onClick={() => patchAgent({ status: agent.status === 'active' ? 'disabled' : 'active' }, agent.status === 'active' ? 'Agente apagado.' : 'Agente activado.')}
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <SettingsIcon size={14} />}
              {agent.status === 'active' ? 'Apagar' : 'Activar'}
            </button>
          </div>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="row mb-6" style={{ gap: 8, borderBottom: '1px solid var(--rai-border)', paddingBottom: 0 }}>
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              className="ghost"
              onClick={() => setSubTab(tab.id)}
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

      {subTab === 'config' && <ConfigTab agent={agent} setAgent={setAgent} patchAgent={patchAgent} saving={saving} />}
      {subTab === 'entrenamiento' && <EntrenamientoTab agent={agent} setAgent={setAgent} />}
      {subTab === 'objetivos' && <ObjetivosTab agent={agent} setAgent={setAgent} patchAgent={patchAgent} saving={saving} />}
    </div>
  );
}

// ============================================================
// TAB: Configuración del Bot
// ============================================================
function ConfigTab({
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

// ============================================================
// TAB: Entrenamiento del bot (Knowledge Base Triggers)
// ============================================================
function EntrenamientoTab({
  agent,
  setAgent,
}: {
  agent: AgentDetail;
  setAgent: React.Dispatch<React.SetStateAction<AgentDetail | null>>;
}) {
  const [allKBs, setAllKBs] = useState<KBSummary[]>([]);
  const [loadingKBs, setLoadingKBs] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedKB, setSelectedKB] = useState('');
  const [condition, setCondition] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingCondition, setEditingCondition] = useState<Record<string, string>>({});

  async function loadKBs() {
    setLoadingKBs(true);
    try {
      const res = await fetch('/api/knowledge-bases');
      if (res.ok) {
        const data = await res.json();
        setAllKBs(data.knowledgeBases || []);
      }
    } catch {
      toast.error('Error de red al cargar bases de conocimiento.');
    } finally {
      setLoadingKBs(false);
    }
  }

  useEffect(() => {
    loadKBs();
  }, []);

  const linkedIds = new Set(agent.triggers.map((t) => t.knowledgeBase.id));
  const availableKBs = allKBs.filter((kb) => !linkedIds.has(kb.id));

  async function addTrigger() {
    if (!selectedKB) {
      toast.error('Selecciona una base de conocimiento.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/ai-agents/${agent.id}/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledgeBaseId: selectedKB, triggerCondition: condition.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgent((prev) => (prev ? { ...prev, triggers: [...prev.triggers, data.trigger] } : prev));
        toast.success('Base de conocimiento vinculada.');
        setShowModal(false);
        setSelectedKB('');
        setCondition('');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function removeTrigger(trigger: TriggerT) {
    if (!confirm(`¿Desvincular "${trigger.knowledgeBase.name}" de este agente?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ai-agents/${agent.id}/triggers/${trigger.id}`, { method: 'DELETE' });
      if (res.ok) {
        setAgent((prev) => (prev ? { ...prev, triggers: prev.triggers.filter((t) => t.id !== trigger.id) } : prev));
        toast.success('Base de conocimiento desvinculada.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function saveCondition(trigger: TriggerT) {
    const value = editingCondition[trigger.id];
    if (value === undefined) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ai-agents/${agent.id}/triggers/${trigger.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerCondition: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgent((prev) =>
          prev ? { ...prev, triggers: prev.triggers.map((t) => (t.id === trigger.id ? data.trigger : t)) } : prev
        );
        toast.success('Condición actualizada.');
        setEditingCondition((prev) => {
          const next = { ...prev };
          delete next[trigger.id];
          return next;
        });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <span style={{ fontWeight: 600 }}>Knowledge Base Triggers</span>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>
            Vincula bases de conocimiento (FAQs, texto, tablas, archivos, rastreador web) para que el agente las use
            al responder. Define una condición opcional para activarla solo en ciertos casos.
          </p>
        </div>
        <button className="primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Agregar base de conocimiento
        </button>
      </div>

      {agent.triggers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <BookOpen size={32} className="muted" style={{ marginBottom: 8 }} />
          <p className="muted">Este agente aún no tiene bases de conocimiento vinculadas.</p>
          <p className="muted" style={{ fontSize: 12 }}>
            Sin entrenamiento, el agente solo usará su personalidad y objetivos para responder.
          </p>
        </div>
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          {agent.triggers.map((t) => (
            <div key={t.id} className="panel">
              <div className="row-between mb-2">
                <div>
                  <Link href={`/agentes-ia/base-conocimiento/${t.knowledgeBase.id}`} style={{ fontWeight: 600, color: 'var(--rai-text)' }}>
                    {t.knowledgeBase.name}
                  </Link>
                  {t.knowledgeBase.description && (
                    <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>{t.knowledgeBase.description}</p>
                  )}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="badge-gold">{t.knowledgeBase._count?.items ?? 0} elementos</span>
                  <button className="btn-sm btn-icon danger" onClick={() => removeTrigger(t)} disabled={busy} title="Desvincular">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  placeholder="Condición de activación (opcional). Ej: solo cuando preguntan por precios u horarios."
                  value={editingCondition[t.id] ?? t.triggerCondition ?? ''}
                  onChange={(e) => setEditingCondition((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  style={{ flex: 1 }}
                />
                {editingCondition[t.id] !== undefined && editingCondition[t.id] !== (t.triggerCondition ?? '') && (
                  <button className="secondary btn-sm" onClick={() => saveCondition(t)} disabled={busy}>
                    Guardar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: agregar base de conocimiento */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row-between mb-4">
              <h3 style={{ margin: 0 }}>Agregar base de conocimiento</h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </div>

            {loadingKBs ? (
              <div className="row" style={{ justifyContent: 'center', padding: 20 }}>
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : availableKBs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p className="muted">No tienes más bases de conocimiento disponibles para vincular.</p>
                <Link href="/agentes-ia/base-conocimiento">
                  <button className="secondary mt-4"><Plus size={14} /> Crear base de conocimiento</button>
                </Link>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Base de conocimiento</label>
                  <select className="input" value={selectedKB} onChange={(e) => setSelectedKB(e.target.value)}>
                    <option value="">Selecciona una base...</option>
                    {availableKBs.map((kb) => (
                      <option key={kb.id} value={kb.id}>
                        {kb.name} ({kb._count?.items ?? 0} elementos)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Condición de activación (opcional)</label>
                  <textarea
                    className="input"
                    placeholder="Ej: usar solo cuando el cliente pregunte por precios, horarios o políticas de cancelación."
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  />
                </div>
                <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                  <button className="ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button className="primary" onClick={addTrigger} disabled={busy}>
                    {busy ? <Loader2 className="animate-spin" size={14} /> : 'Vincular'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB: Objetivos del bot (personalidad, objetivos, LLM, probar bot)
// ============================================================
function ObjetivosTab({
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
  const [personality, setPersonality] = useState(agent.personality || '');
  const [objective, setObjective] = useState(agent.objective || '');
  const [additionalInfo, setAdditionalInfo] = useState(agent.additionalInfo || '');
  const [welcomeMessage, setWelcomeMessage] = useState(agent.welcomeMessage || '');
  const [fallbackMessage, setFallbackMessage] = useState(agent.fallbackMessage || '');
  const [llmProvider, setLlmProvider] = useState(agent.llmProvider);
  const [llmModel, setLlmModel] = useState(agent.llmModel);

  // ─── Bot Goals · Reserva de citas (frontend only, pendiente de backend) ───
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [bookingCalendar, setBookingCalendar] = useState('');
  const [transferAfterBooking, setTransferAfterBooking] = useState(false);
  const [nextHandler, setNextHandler] = useState<'humano' | 'bot' | ''>('');

  // ─── Bot Goals · Workflow triggers (frontend only, pendiente de backend) ───
  const [workflowTriggerEnabled, setWorkflowTriggerEnabled] = useState(false);
  const [triggerCondition, setTriggerCondition] = useState('booking_completed');
  const [triggerWorkflow, setTriggerWorkflow] = useState('');

  const dirty =
    personality !== (agent.personality || '') ||
    objective !== (agent.objective || '') ||
    additionalInfo !== (agent.additionalInfo || '') ||
    welcomeMessage !== (agent.welcomeMessage || '') ||
    fallbackMessage !== (agent.fallbackMessage || '') ||
    llmProvider !== agent.llmProvider ||
    llmModel !== agent.llmModel;

  async function save() {
    await patchAgent(
      { personality, objective, additionalInfo, welcomeMessage, fallbackMessage, llmProvider, llmModel },
      'Objetivos guardados.'
    );
    setAgent((prev) =>
      prev ? { ...prev, personality, objective, additionalInfo, welcomeMessage, fallbackMessage, llmProvider, llmModel } : prev
    );
  }

  const currentProviderModels = LLM_PROVIDERS.find((p) => p.provider === llmProvider)?.models || LLM_PROVIDERS[0].models;

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>Personalidad del agente</span>
          </div>
          <textarea
            className="input"
            style={{ minHeight: 160 }}
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="Describe el rol, tono de voz, nivel de formalidad y forma de comunicarse del agente..."
          />
        </div>

        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>Objetivos y flujos de conversación</span>
          </div>
          <textarea
            className="input"
            style={{ minHeight: 160 }}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Describe las intenciones del cliente que el agente debe reconocer y cómo debe responder a cada una..."
          />
        </div>

        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>Información adicional</span>
          </div>
          <textarea
            className="input"
            style={{ minHeight: 120 }}
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Horarios, políticas, dirección, links útiles, datos que el agente debe conocer siempre..."
          />
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600 }}>Mensaje de bienvenida</span>
            </div>
            <textarea className="input" style={{ minHeight: 80 }} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} />
          </div>
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600 }}>Mensaje de respaldo</span>
            </div>
            <textarea className="input" style={{ minHeight: 80 }} value={fallbackMessage} onChange={(e) => setFallbackMessage(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>Modelo de IA</span>
          </div>
          <div className="grid grid-2">
            <div className="form-group">
              <label>Proveedor</label>
              <select
                className="input"
                value={llmProvider}
                onChange={(e) => {
                  const p = e.target.value;
                  setLlmProvider(p);
                  setLlmModel(LLM_PROVIDERS.find((x) => x.provider === p)?.models[0]?.id || '');
                }}
              >
                {LLM_PROVIDERS.map((p) => (
                  <option key={p.provider} value={p.provider}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Modelo</label>
              <select className="input" value={llmModel} onChange={(e) => setLlmModel(e.target.value)}>
                {currentProviderModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ─── Reserva de citas (Bot Goals · Appointment booking) ─── */}
        <div className="card">
          <div className="card-header row-between" style={{ alignItems: 'center' }}>
            <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} color="var(--rai-gold)" /> Reserva de citas
            </span>
            <label className="row" style={{ gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={bookingEnabled}
                onChange={(e) => setBookingEnabled(e.target.checked)}
              />
              <span className="muted">Activar</span>
            </label>
          </div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            El agente guiará al contacto para reservar una cita en uno de tus calendarios.
          </p>

          {bookingEnabled && (
            <div className="grid" style={{ gap: 10 }}>
              <div className="form-group">
                <label>Calendario para reservas</label>
                <div className="row" style={{ gap: 6 }}>
                  <select
                    className="input"
                    value={bookingCalendar}
                    onChange={(e) => setBookingCalendar(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Seleccionar calendario…</option>
                    <option value="placeholder">— Conectar con /calendarios (próximamente) —</option>
                  </select>
                  <Link href="/calendarios" className="ghost btn-sm" style={{ whiteSpace: 'nowrap' }}>
                    <ExternalLink size={12} /> Ver
                  </Link>
                </div>
              </div>

              <label className="row" style={{ gap: 6, fontSize: 13, cursor: 'pointer', padding: '6px 0' }}>
                <input
                  type="checkbox"
                  checked={transferAfterBooking}
                  onChange={(e) => setTransferAfterBooking(e.target.checked)}
                />
                <ArrowRightLeft size={13} color="var(--rai-muted)" />
                <span>Transferir conversación tras reservar</span>
              </label>

              {transferAfterBooking && (
                <div className="form-group">
                  <label>Siguiente handler</label>
                  <select
                    className="input"
                    value={nextHandler}
                    onChange={(e) => setNextHandler(e.target.value as any)}
                  >
                    <option value="">Seleccionar…</option>
                    <option value="humano">Asignar a humano (cola general)</option>
                    <option value="bot">Otro bot del workspace</option>
                  </select>
                </div>
              )}

              <div className="row" style={{ gap: 6, padding: 8, background: 'rgba(201,168,76,0.06)', borderRadius: 6, fontSize: 11 }}>
                <Info size={12} color="var(--rai-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span className="muted">
                  La configuración de reserva se aplicará cuando el modelo de datos esté conectado al backend.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Disparadores de workflow (Bot Goals · Workflow triggers) ─── */}
        <div className="card">
          <div className="card-header row-between" style={{ alignItems: 'center' }}>
            <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Zap size={14} color="var(--rai-gold)" /> Disparadores de workflow
            </span>
            <label className="row" style={{ gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={workflowTriggerEnabled}
                onChange={(e) => setWorkflowTriggerEnabled(e.target.checked)}
              />
              <span className="muted">Activar</span>
            </label>
          </div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Cuando ocurra un evento en la conversación, dispara un workflow de Automatización.
          </p>

          {workflowTriggerEnabled && (
            <div className="grid grid-2" style={{ gap: 10 }}>
              <div className="form-group">
                <label>Cuando ocurra</label>
                <select
                  className="input"
                  value={triggerCondition}
                  onChange={(e) => setTriggerCondition(e.target.value)}
                >
                  <option value="booking_completed">Reserva completada</option>
                  <option value="conversation_ended">Conversación finalizada</option>
                  <option value="user_intent_buy">Intención de compra detectada</option>
                  <option value="user_intent_support">Intención de soporte detectada</option>
                  <option value="handoff_requested">Transferencia a humano solicitada</option>
                </select>
              </div>
              <div className="form-group">
                <label>Disparar workflow</label>
                <div className="row" style={{ gap: 6 }}>
                  <select
                    className="input"
                    value={triggerWorkflow}
                    onChange={(e) => setTriggerWorkflow(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Seleccionar workflow…</option>
                    <option value="placeholder">— Conectar con /automatizacion (próximamente) —</option>
                  </select>
                  <Link href="/automatizacion" className="ghost btn-sm" style={{ whiteSpace: 'nowrap' }}>
                    <ExternalLink size={12} /> Ver
                  </Link>
                </div>
              </div>

              <div
                className="row"
                style={{ gridColumn: '1 / -1', gap: 6, padding: 8, background: 'rgba(201,168,76,0.06)', borderRadius: 6, fontSize: 11 }}
              >
                <Info size={12} color="var(--rai-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span className="muted">
                  Los triggers de workflow se ejecutarán cuando el modelo de datos esté conectado al backend.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="primary" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : 'Guardar objetivos'}
          </button>
        </div>
      </div>

      <TestChatPanel agentId={agent.id} dirty={dirty} />
    </div>
  );
}

// ============================================================
// Panel de chat de prueba (lado derecho de "Objetivos del bot")
// ============================================================
function TestChatPanel({ agentId, dirty }: { agentId: string; dirty: boolean }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, error } = useChat({
    api: `/api/ai-agents/${agentId}/test`,
  });

  return (
    <div className="card" style={{ position: 'sticky', top: 16, height: 640, display: 'flex', flexDirection: 'column', padding: 0 }}>
      <div className="card-header" style={{ padding: 16, margin: 0 }}>
        <div className="row" style={{ gap: 8 }}>
          <Sparkles size={15} color="var(--rai-gold)" />
          <span style={{ fontWeight: 600 }}>Probar bot</span>
        </div>
        <button className="ghost btn-sm" onClick={() => setMessages([])} title="Reiniciar conversación">
          <RotateCcw size={13} /> Reiniciar
        </button>
      </div>

      {dirty && (
        <div className="muted" style={{ fontSize: 12, padding: '0 16px 8px', color: 'var(--rai-warning)' }}>
          Tienes cambios sin guardar: el bot de prueba usará la última configuración guardada.
        </div>
      )}

      <div className="chat-log" style={{ flex: 1 }}>
        {messages.length === 0 && (
          <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '24px 8px' }}>
            Escribe un mensaje para probar cómo responde el agente con su personalidad, objetivos y bases de
            conocimiento actuales.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.role === 'user' ? 'user' : 'assistant'}`}>
            {m.content}
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble assistant">
            <Loader2 className="animate-spin" size={14} />
          </div>
        )}
        {error && (
          <div className="chat-bubble assistant" style={{ borderColor: 'var(--rai-error)', color: 'var(--rai-error)' }}>
            {error.message}
          </div>
        )}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input className="input" placeholder="Escribe un mensaje de prueba..." value={input} onChange={handleInputChange} />
        <button className="primary btn-icon" type="submit" disabled={isLoading || !input.trim()}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
