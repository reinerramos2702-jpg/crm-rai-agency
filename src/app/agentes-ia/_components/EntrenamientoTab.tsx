'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { type TriggerT, type AgentDetail, type KBSummary } from './agent-types';

export function EntrenamientoTab({
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
