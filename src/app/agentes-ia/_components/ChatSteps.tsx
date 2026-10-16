'use client';

import React from 'react';
import { CHAT_CHANNELS, GOALS, TONES, type ChatDraft } from '@/lib/agent-wizard';
import { ChoiceGrid, CheckRow, Field } from './wizard-fields';
import { KnowledgePicker } from './KnowledgePicker';

interface Props {
  stepId: string;
  draft: ChatDraft;
  patch: (p: Partial<ChatDraft>) => void;
}

/** Contenido de cada paso del asistente de agente de chat (excepto «Revisar»). */
export function ChatStepBody({ stepId, draft, patch }: Props) {
  if (stepId === 'identidad') {
    return (
      <>
        <Field label="Nombre del agente" htmlFor="cw-name" hint="Cómo se presentará ante tus clientes. Ejemplo: Lucía de Hidromáticos.">
          <input id="cw-name" className="input" maxLength={60} autoFocus value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Asistente virtual" />
        </Field>
        <Field label="Negocio o empresa" htmlFor="cw-business" hint="El agente lo mencionará al saludar y al presentar tus servicios.">
          <input id="cw-business" className="input" maxLength={80} value={draft.business} onChange={(e) => patch({ business: e.target.value })} placeholder="Nombre de tu negocio" />
        </Field>
      </>
    );
  }

  if (stepId === 'objetivo') {
    return (
      <>
        <div className="ag-field">
          <span className="label">¿Qué debe lograr?</span>
          <ChoiceGrid label="Objetivo principal" options={GOALS} value={draft.goal} onChange={(goal) => patch({ goal })} />
        </div>
        <Field label="Detalle del objetivo" htmlFor="cw-goal" hint="Pasos que debe seguir, datos que debe pedir y cuándo pasar la conversación a una persona.">
          <textarea id="cw-goal" className="input" rows={5} value={draft.goalDetail} onChange={(e) => patch({ goalDetail: e.target.value })} placeholder="Ejemplo: saluda, pregunta qué producto busca, ofrece el catálogo y pide nombre y teléfono para que un asesor lo contacte." />
        </Field>
      </>
    );
  }

  if (stepId === 'entrenamiento') {
    return (
      <>
        <div className="ag-field">
          <KnowledgePicker selected={draft.kbIds} onChange={(kbIds) => patch({ kbIds })} />
        </div>
        <Field label="Datos clave del negocio" htmlFor="cw-info" hint="Horarios, tarifas, políticas, ubicación: lo que el agente debe saber de memoria.">
          <textarea id="cw-info" className="input" rows={4} value={draft.businessInfo} onChange={(e) => patch({ businessInfo: e.target.value })} />
        </Field>
        <div className="ag-field">
          <span className="label">Tono</span>
          <ChoiceGrid label="Tono de conversación" options={TONES} value={draft.tone} onChange={(tone) => patch({ tone })} />
        </div>
        <Field label="Mensaje de bienvenida" htmlFor="cw-welcome">
          <textarea id="cw-welcome" className="input" rows={2} value={draft.welcome} onChange={(e) => patch({ welcome: e.target.value })} />
        </Field>
        <Field label="Cuando no sabe la respuesta" htmlFor="cw-fallback">
          <textarea id="cw-fallback" className="input" rows={2} value={draft.fallback} onChange={(e) => patch({ fallback: e.target.value })} />
        </Field>
      </>
    );
  }

  if (stepId === 'canales') {
    const toggle = (ch: string, on: boolean) => patch({ channels: on ? [...draft.channels, ch] : draft.channels.filter((c) => c !== ch) });
    return (
      <div className="ag-field">
        <span className="label">Canales donde responderá</span>
        <div className="ag-checks">
          {CHAT_CHANNELS.map((ch) => (
            <CheckRow key={ch} checked={draft.channels.includes(ch)} onChange={(on) => toggle(ch, on)} title={ch} />
          ))}
        </div>
        <span className="ag-hint">Podrás cambiarlos después en la configuración del agente.</span>
      </div>
    );
  }

  return null;
}
