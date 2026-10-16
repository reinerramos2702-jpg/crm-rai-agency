'use client';

import React, { useMemo, useState } from 'react';
import { CalendarClock, Gauge, Languages, PhoneForwarded, Save, Scale, Siren } from 'lucide-react';
import toast from 'react-hot-toast';
import { VOICE_LANGUAGES, VOICE_SPEEDS, WEEK_DAYS, type StepIssue } from '@/lib/agent-wizard';
import { LIMITS, validateVoiceSettings, type VoiceSettings } from '@/lib/voice/settings';
import { CheckRow, ChoiceGrid, Field, IssueList } from '../../_components/wizard-fields';

interface Props {
  settings: VoiceSettings;
  onChange: (s: VoiceSettings) => void;
  onSave: (s: VoiceSettings) => boolean;
  /** Tope duro del entorno (USD): ningún ajuste puede superarlo. */
  envCapUsd: number;
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="ag-section">
      <h3 className="ag-section-title"><Icon size={15} color="var(--ag-accent)" aria-hidden="true" /> {title}</h3>
      {children}
    </section>
  );
}

/** Ajustes generales de voz del workspace (horario, transferencia, aviso de IA, grabación, tope). */
export function SettingsPanel({ settings: s, onChange, onSave, envCapUsd }: Props) {
  const [dirty, setDirty] = useState(false);
  const result = useMemo(() => validateVoiceSettings(s), [s]);
  const issues: StepIssue[] = result.ok ? [] : result.errors.map((e) => ({ field: e.field, message: e.message, level: 'error' as const }));
  const warnings: StepIssue[] = [];
  if (s.recording && !s.aiDisclosure) warnings.push({ field: 'recording', level: 'warn', message: 'Si grabas, avisa también que es una IA: ambos avisos van juntos en el saludo.' });
  if (s.monthlyCapUsd > envCapUsd) warnings.push({ field: 'monthlyCapUsd', level: 'warn', message: `El tope del servidor es US$ ${envCapUsd}; ese valor manda sobre el que escribas aquí.` });

  const set = (p: Partial<VoiceSettings>) => { setDirty(true); onChange({ ...s, ...p }); };
  const setHours = (p: Partial<VoiceSettings['hours']>) => set({ hours: { ...s.hours, ...p } });
  const setTransfer = (p: Partial<VoiceSettings['transfer']>) => set({ transfer: { ...s.transfer, ...p } });
  const toggleDay = (id: number) => setHours({ days: s.hours.days.includes(id) ? s.hours.days.filter((d) => d !== id) : [...s.hours.days, id] });

  const save = () => {
    if (!result.ok) return;
    if (onSave(result.data)) {
      setDirty(false);
      toast.success('Ajustes de voz guardados en este navegador.');
    } else {
      toast.error('Este navegador no permitió guardar los ajustes.');
    }
  };

  return (
    <div className="vz-settings">
      <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        Estos ajustes se guardan en este navegador y se envían al proveedor al activar el agente. Guardarlos en el servidor requiere una migración pendiente de aprobación.
      </p>

      <Section icon={Languages} title="Idioma, voz y saludo">
        <ChoiceGrid label="Idioma y acento" options={VOICE_LANGUAGES} value={s.language} onChange={(language) => set({ language })} />
        <div style={{ height: 12 }} />
        <ChoiceGrid label="Ritmo de habla" options={VOICE_SPEEDS} value={s.speed} onChange={(speed) => set({ speed })} />
        <div style={{ height: 16 }} />
        <Field label="Saludo inicial" htmlFor="vs-greeting" hint={`${s.greeting.length}/${LIMITS.greeting}. El aviso de IA y de grabación se añaden solos antes de la pregunta final.`}>
          <textarea id="vs-greeting" className="input" rows={2} maxLength={LIMITS.greeting} value={s.greeting} onChange={(e) => set({ greeting: e.target.value })} />
        </Field>
        <Field label="Voz del proveedor (opcional)" htmlFor="vs-voice" hint="voice_id de Retell. Vacío = la voz por defecto del servidor (RETELL_VOICE_ID).">
          <input id="vs-voice" className="input" maxLength={LIMITS.voiceId} value={s.providerVoiceId} onChange={(e) => set({ providerVoiceId: e.target.value })} autoComplete="off" />
        </Field>
      </Section>

      <Section icon={CalendarClock} title="Horario de atención">
        <CheckRow checked={s.hours.enabled} onChange={(enabled) => setHours({ enabled })} title="Atender solo en este horario" text={`Hora de ${s.hours.timezone}. Fuera de horario el agente da el mensaje de abajo.`} />
        {s.hours.enabled && (
          <div className="fx-field-in" style={{ marginTop: 12 }}>
            <div className="ag-days" role="group" aria-label="Días de atención" style={{ marginBottom: 12 }}>
              {WEEK_DAYS.map((d) => (
                <button key={d.id} type="button" className="ag-day" aria-pressed={s.hours.days.includes(d.id)} title={d.label} onClick={() => toggleDay(d.id)}>{d.short}</button>
              ))}
            </div>
            <div className="ag-field-row">
              <Field label="Desde" htmlFor="vs-from"><input id="vs-from" className="input" type="time" value={s.hours.from} onChange={(e) => setHours({ from: e.target.value })} /></Field>
              <Field label="Hasta" htmlFor="vs-to"><input id="vs-to" className="input" type="time" value={s.hours.to} onChange={(e) => setHours({ to: e.target.value })} /></Field>
            </div>
            <Field label="Mensaje fuera de horario" htmlFor="vs-after">
              <textarea id="vs-after" className="input" rows={2} maxLength={LIMITS.message} value={s.afterHoursMessage} onChange={(e) => set({ afterHoursMessage: e.target.value })} />
            </Field>
          </div>
        )}
      </Section>

      <Section icon={PhoneForwarded} title="Transferencia a una persona">
        <CheckRow checked={s.transfer.enabled} onChange={(enabled) => setTransfer({ enabled })} title="Permitir transferir la llamada" text="El proveedor transfiere en frío al número indicado." />
        {s.transfer.enabled && (
          <div className="fx-field-in" style={{ marginTop: 12 }}>
            <Field label="Número de destino" htmlFor="vs-phone" hint="Con código de país. Ejemplo: +58 412 1234567.">
              <input id="vs-phone" className="input" type="tel" inputMode="tel" value={s.transfer.number} onChange={(e) => setTransfer({ number: e.target.value })} placeholder="+58 412 1234567" />
            </Field>
            <Field label="¿Cuándo transferir?" htmlFor="vs-when">
              <textarea id="vs-when" className="input" rows={2} maxLength={LIMITS.when} value={s.transfer.when} onChange={(e) => setTransfer({ when: e.target.value })} />
            </Field>
          </div>
        )}
      </Section>

      <Section icon={Siren} title="Palabras de escalamiento">
        <Field label="Palabras o frases (separadas por coma)" htmlFor="vs-kw" hint={`Máximo ${LIMITS.keywords}. Si la persona las dice, se transfiere o se toma el mensaje.`}>
          <input
            id="vs-kw"
            className="input"
            value={s.escalationKeywords.join(', ')}
            onChange={(e) => set({ escalationKeywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })}
          />
        </Field>
      </Section>

      <Section icon={Scale} title="Aviso legal y grabación">
        <div className="ag-checks">
          <CheckRow checked={s.aiDisclosure} onChange={(aiDisclosure) => set({ aiDisclosure })} title="Avisar que es una IA" text="Recomendado: el saludo dice que es un asistente de inteligencia artificial." />
          <CheckRow checked={s.recording} onChange={(recording) => set({ recording })} title="Guardar grabación y transcripción" text="Avisa en el saludo que la llamada puede ser grabada. Apagado: solo se conservan datos básicos y el CRM no tendrá transcripción. Requiere revisión legal." />
        </div>
      </Section>

      <Section icon={Gauge} title="Límites y gasto">
        <div className="ag-field-row">
          <Field label="Tope mensual (USD)" htmlFor="vs-cap" hint={`Entre ${LIMITS.capMin} y ${LIMITS.capMax}. Tope del servidor: US$ ${envCapUsd}.`}>
            <input id="vs-cap" className="input" type="number" min={LIMITS.capMin} max={LIMITS.capMax} step={1} value={s.monthlyCapUsd} onChange={(e) => set({ monthlyCapUsd: Number(e.target.value) })} />
          </Field>
          <Field label="Minutos máximos por llamada" htmlFor="vs-max" hint="Entre 1 y 60.">
            <input id="vs-max" className="input" type="number" min={LIMITS.minutesMin} max={LIMITS.minutesMax} value={s.maxCallMinutes} onChange={(e) => set({ maxCallMinutes: Math.round(Number(e.target.value)) })} />
          </Field>
        </div>
      </Section>

      <IssueList issues={[...issues, ...warnings]} />
      <div className="ag-wiz-foot">
        <span className="ag-saved">{dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}</span>
        <div className="ag-wiz-foot-end">
          <button type="button" className="ag-btn ag-btn--accent" onClick={save} disabled={!result.ok || !dirty}>
            <Save size={14} aria-hidden="true" /> Guardar ajustes
          </button>
        </div>
      </div>
    </div>
  );
}
