'use client';

import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import {
  GOALS, SPEED_FACTOR, TONES, VOICES, VOICE_LANGUAGES, VOICE_SPEEDS, type VoiceDraft,
} from '@/lib/agent-wizard';
import { ChoiceGrid, Field } from './wizard-fields';
import { KnowledgePicker } from './KnowledgePicker';
import { VoiceRulesStep } from './VoiceRulesStep';

interface Props {
  stepId: string;
  draft: VoiceDraft;
  patch: (p: Partial<VoiceDraft>) => void;
}

/** Vista previa con la voz del navegador (aproximada): no es la voz final ni usa telefonía. */
function GreetingPreview({ draft }: { draft: VoiceDraft }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  if (!supported) return null;

  const play = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(draft.greeting);
    u.lang = draft.language === 'es-419' ? 'es-MX' : draft.language;
    u.rate = SPEED_FACTOR[draft.speed];
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" className="ag-btn ag-btn--voice" onClick={play} disabled={speaking || !draft.greeting.trim()}>
        <Volume2 size={14} aria-hidden="true" /> {speaking ? 'Reproduciendo…' : 'Escuchar saludo'}
      </button>
      <span className="ag-hint" style={{ marginLeft: 8 }}>Voz del navegador, solo orientativa.</span>
    </div>
  );
}

/** Contenido de los pasos del asistente de agente de voz (excepto «Revisar y probar»). */
export function VoiceStepBody({ stepId, draft, patch }: Props) {
  if (stepId === 'voz') {
    return (
      <>
        <div className="ag-field-row">
          <Field label="Nombre del agente" htmlFor="vw-name" hint="Cómo se presenta al contestar.">
            <input id="vw-name" className="input" maxLength={60} autoFocus value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Agente de voz" />
          </Field>
          <Field label="Empresa que atiende" htmlFor="vw-business" hint="Lo dirá al saludar.">
            <input id="vw-business" className="input" maxLength={80} value={draft.business} onChange={(e) => patch({ business: e.target.value })} placeholder="Nombre de tu empresa" />
          </Field>
        </div>
        <Field label="Idioma y acento" htmlFor="vw-lang">
          <select id="vw-lang" className="input" value={draft.language} onChange={(e) => patch({ language: e.target.value as VoiceDraft['language'] })}>
            {VOICE_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </Field>
        <div className="ag-field">
          <span className="label">Voz</span>
          <ChoiceGrid
            label="Voz del agente"
            options={VOICES.map((v) => ({ id: v.id, label: v.label, description: `${v.gender === 'femenina' ? 'Voz femenina' : 'Voz masculina'} · ${v.description}` }))}
            value={draft.voiceId}
            onChange={(voiceId) => patch({ voiceId })}
          />
          <span className="ag-hint">Catálogo de ejemplo: el proveedor de voz se define al conectar la telefonía.</span>
        </div>
        <div className="ag-field">
          <span className="label">Tono</span>
          <ChoiceGrid label="Tono de la conversación" options={TONES} value={draft.tone} onChange={(tone) => patch({ tone })} />
        </div>
        <div className="ag-field">
          <span className="label">Velocidad</span>
          <ChoiceGrid label="Velocidad de habla" options={VOICE_SPEEDS} value={draft.speed} onChange={(speed) => patch({ speed })} />
        </div>
      </>
    );
  }

  if (stepId === 'objetivo') {
    return (
      <>
        <div className="ag-field">
          <span className="label">¿Para qué atiende las llamadas?</span>
          <ChoiceGrid label="Objetivo principal" options={GOALS} value={draft.goal} onChange={(goal) => patch({ goal })} />
        </div>
        <Field label="Detalle del objetivo" htmlFor="vw-goal" hint="Qué datos pedir, qué ofrecer y cuándo cerrar la llamada.">
          <textarea id="vw-goal" className="input" rows={4} value={draft.goalDetail} onChange={(e) => patch({ goalDetail: e.target.value })} placeholder="Ejemplo: identifica el motivo de la llamada, resuelve con la base de conocimiento y, si quiere cita, pide nombre, teléfono y horario preferido." />
        </Field>
        <Field label="Saludo inicial" htmlFor="vw-greet" hint={`${draft.greeting.length}/280 caracteres. Breve y claro: la gente escucha, no lee.`}>
          <textarea id="vw-greet" className="input" rows={3} value={draft.greeting} onChange={(e) => patch({ greeting: e.target.value })} />
        </Field>
        <GreetingPreview draft={draft} />
      </>
    );
  }

  if (stepId === 'conocimiento') {
    return (
      <>
        <div className="ag-field">
          <KnowledgePicker selected={draft.kbIds} onChange={(kbIds) => patch({ kbIds })} />
          <span className="ag-hint">El agente responde las preguntas de quien llama con estas bases: FAQs, textos, URLs y documentos ya cargados.</span>
        </div>
        <Field label="Datos clave de la empresa" htmlFor="vw-info" hint="Dirección, horarios, precios y políticas que debe poder decir de memoria.">
          <textarea id="vw-info" className="input" rows={4} value={draft.businessInfo} onChange={(e) => patch({ businessInfo: e.target.value })} />
        </Field>
      </>
    );
  }

  if (stepId === 'reglas') {
    return <VoiceRulesStep rules={draft.rules} patch={(p) => patch({ rules: { ...draft.rules, ...p } })} />;
  }

  return null;
}
