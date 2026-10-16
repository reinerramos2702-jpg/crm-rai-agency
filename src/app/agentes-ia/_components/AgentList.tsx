'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bot, Loader2, MessageSquare, Phone, Star, Zap, Copy, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { STATUS_BADGE, STATUS_LABEL } from './agent-types';
import { CHANNEL_LABEL, fmtDate } from './format';
import { AgentTypeCards } from './NewAgentButtons';
import type { AgentListItem } from './agent-list-types';

async function callApi(url: string, method: string, body: unknown, okMsg: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      toast.success(okMsg);
      return true;
    }
    const err: { error?: string } = await res.json().catch(() => ({}));
    toast.error(err.error || `Error del servidor (${res.status})`);
  } catch {
    toast.error('Error de red: no se pudo contactar al servidor.');
  }
  return false;
}

interface Props {
  agents: AgentListItem[] | undefined;
  error: string | null;
  onChanged: () => void;
}

export function AgentList({ agents, error, onChanged }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(agent: AgentListItem, url: string, method: string, body: unknown, okMsg: string) {
    setBusyId(agent.id);
    const ok = await callApi(url, method, body, okMsg);
    setBusyId(null);
    if (ok) onChanged();
  }

  const setPrimary = (a: AgentListItem) =>
    run(a, `/api/ai-agents/${a.id}`, 'PATCH', { isPrimary: true }, `"${a.name}" es ahora el agente principal.`);
  const toggleStatus = (a: AgentListItem) => {
    const active = a.status === 'active';
    return run(a, `/api/ai-agents/${a.id}`, 'PATCH', { status: active ? 'disabled' : 'active' }, active ? 'Agente apagado.' : 'Agente activado.');
  };
  const duplicate = (a: AgentListItem) => run(a, `/api/ai-agents/${a.id}/duplicate`, 'POST', null, 'Agente duplicado.');
  const remove = (a: AgentListItem) => {
    if (!confirm(`¿Eliminar el agente "${a.name}"? Esta acción no se puede deshacer.`)) return;
    return run(a, `/api/ai-agents/${a.id}`, 'DELETE', null, 'Agente eliminado.');
  };

  if (!agents && error) {
    return (
      <div className="card ag-empty-inline">
        <p>No se pudo cargar la lista de agentes ({error}).</p>
        <button className="ag-btn ag-btn--ghost" style={{ marginTop: 12 }} onClick={onChanged}>Reintentar</button>
      </div>
    );
  }

  if (!agents) {
    return (
      <div className="card" style={{ display: 'grid', gap: 14 }} aria-busy="true">
        <span className="fx-sr-only" role="status">Cargando agentes…</span>
        {[0, 1, 2].map((i) => <SkeletonLine key={i} height={18} width={i % 2 ? '90%' : '100%'} />)}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
          <Bot size={32} className="muted" aria-hidden="true" />
          <h2 style={{ fontSize: 18, margin: '8px 0 4px' }}>Aún no tienes agentes de IA</h2>
          <p className="muted">Elige qué tipo de agente quieres crear primero.</p>
        </div>
        <AgentTypeCards />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span style={{ fontWeight: 600 }}>Lista de agentes</span>
        <span className="muted" style={{ fontSize: 12 }}>{agents.length} en total</span>
      </div>
      <div className="ag-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Agente</th><th>Tipo</th><th>Canales</th><th>Modelo</th>
              <th>Conversaciones</th><th>Estado</th><th>Actualizado</th><th><span className="fx-sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="fx-reveal">
                <td>
                  <Link href={`/agentes-ia/${a.id}`} style={{ fontWeight: 600, color: 'var(--rai-text)', textDecoration: 'none' }}>{a.name}</Link>
                  {a.isPrimary && <span className="badge-gold" style={{ marginLeft: 8, fontSize: 10 }}><Star size={10} /> Principal</span>}
                </td>
                <td className="muted" style={{ fontSize: 13 }}>
                  <span className="row" style={{ gap: 4 }}>
                    {a.kind === 'voice' ? <><Phone size={12} /> Voz</> : <><MessageSquare size={12} /> Chat</>}
                  </span>
                </td>
                <td className="muted" style={{ fontSize: 12 }}>{a.channels.map((c) => CHANNEL_LABEL[c] || c).join(', ') || '—'}</td>
                <td className="muted" style={{ fontSize: 12 }}>{a.llmProvider} / {a.llmModel}</td>
                <td>{a._count?.conversations ?? 0}</td>
                <td><span className={STATUS_BADGE[a.status] || 'badge-muted'}>{STATUS_LABEL[a.status] || a.status}</span></td>
                <td className="muted" style={{ fontSize: 13 }}>{fmtDate(a.updatedAt)}</td>
                <td>
                  {busyId === a.id ? (
                    <Loader2 className="animate-spin" size={14} aria-label="Procesando" />
                  ) : (
                    <div className="ag-row-actions fx-reveal-actions">
                      {!a.isPrimary && (
                        <button className="ag-icon-btn" title="Marcar como principal" aria-label={`Marcar ${a.name} como principal`} onClick={() => setPrimary(a)}><Star size={14} /></button>
                      )}
                      <button className="ag-icon-btn" title={a.status === 'active' ? 'Apagar agente' : 'Activar agente'} aria-label={a.status === 'active' ? `Apagar ${a.name}` : `Activar ${a.name}`} onClick={() => toggleStatus(a)}><Zap size={14} /></button>
                      <button className="ag-icon-btn" title="Duplicar" aria-label={`Duplicar ${a.name}`} onClick={() => duplicate(a)}><Copy size={14} /></button>
                      <button className="ag-icon-btn ag-icon-btn--danger" title="Eliminar" aria-label={`Eliminar ${a.name}`} onClick={() => remove(a)}><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
