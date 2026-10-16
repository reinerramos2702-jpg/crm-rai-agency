'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Bot, ArrowLeft, Settings as SettingsIcon, Loader2, Star, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { STATUS_BADGE, STATUS_LABEL, SUB_TABS, type AgentDetail, type SubTab } from '../_components/agent-types';
import { ConfigTab } from '../_components/ConfigTab';
import { EntrenamientoTab } from '../_components/EntrenamientoTab';
import { ObjetivosTab } from '../_components/ObjetivosTab';
import { VoiceComingSoon, VoiceLocalSummary } from '../_components/VoiceComingSoon';

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
    return <PageSkeleton cards={0} rows={4} />;
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

      {agent.kind === 'voice' && (
        <div className="mb-6">
          <VoiceLocalSummary agentId={agent.id} />
          <VoiceComingSoon />
        </div>
      )}

      {/* Sub tabs */}
      <div className="ag-tabs" role="tablist" aria-label="Secciones del agente">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} type="button" role="tab" className="ag-tab" aria-selected={subTab === tab.id} onClick={() => setSubTab(tab.id)}>
              <Icon size={15} aria-hidden="true" /> {tab.label}
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
