'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, Calendar, Zap, ArrowRightLeft, ExternalLink, Info } from 'lucide-react';
import { LLM_PROVIDERS, type AgentDetail } from './agent-types';
import { TestChatPanel } from './TestChat';

export function ObjetivosTab({
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
                    onChange={(e) => setNextHandler(e.target.value as 'humano' | 'bot' | '')}
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

      <TestChatPanel agentId={agent.id} dirty={dirty} variant={agent.kind === 'voice' ? 'voice' : 'chat'} sticky />
    </div>
  );
}
