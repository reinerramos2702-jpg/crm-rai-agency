'use client';

import React from 'react';
import { CalendarClock, Mic, PhoneForwarded, Scale, Voicemail } from 'lucide-react';
import { WEEK_DAYS, type CallRules } from '@/lib/agent-wizard';
import { CheckRow, Field } from './wizard-fields';

interface Props {
  rules: CallRules;
  patch: (p: Partial<CallRules>) => void;
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="ag-section">
      <h3 className="ag-section-title"><Icon size={15} color="var(--ag-accent)" aria-hidden="true" /> {title}</h3>
      {children}
    </section>
  );
}

/** Paso «Reglas de llamada»: horario, transferencia, buzón, duración y aviso legal. */
export function VoiceRulesStep({ rules: r, patch }: Props) {
  const toggleDay = (id: number) => patch({ days: r.days.includes(id) ? r.days.filter((d) => d !== id) : [...r.days, id] });
  return (
    <>
      <Section icon={CalendarClock} title="Horario de atención">
        <CheckRow checked={r.hoursEnabled} onChange={(hoursEnabled) => patch({ hoursEnabled })} title="Atender solo en este horario" text="Fuera de horario el agente da el mensaje de abajo." />
        {r.hoursEnabled && (
          <div className="fx-field-in" style={{ marginTop: 12 }}>
            <div className="ag-days" role="group" aria-label="Días de atención" style={{ marginBottom: 12 }}>
              {WEEK_DAYS.map((d) => (
                <button key={d.id} type="button" className="ag-day" aria-pressed={r.days.includes(d.id)} title={d.label} onClick={() => toggleDay(d.id)}>{d.short}</button>
              ))}
            </div>
            <div className="ag-field-row">
              <Field label="Desde" htmlFor="vr-from"><input id="vr-from" className="input" type="time" value={r.hoursFrom} onChange={(e) => patch({ hoursFrom: e.target.value })} /></Field>
              <Field label="Hasta" htmlFor="vr-to"><input id="vr-to" className="input" type="time" value={r.hoursTo} onChange={(e) => patch({ hoursTo: e.target.value })} /></Field>
            </div>
            <Field label="Mensaje fuera de horario" htmlFor="vr-after">
              <textarea id="vr-after" className="input" rows={2} value={r.afterHoursMessage} onChange={(e) => patch({ afterHoursMessage: e.target.value })} />
            </Field>
          </div>
        )}
      </Section>

      <Section icon={PhoneForwarded} title="Transferencia a una persona">
        <CheckRow checked={r.transferEnabled} onChange={(transferEnabled) => patch({ transferEnabled })} title="Permitir transferir la llamada" text="Se aplicará cuando se conecte la telefonía real." />
        {r.transferEnabled && (
          <div className="fx-field-in" style={{ marginTop: 12 }}>
            <Field label="Número de destino" htmlFor="vr-phone" hint="Con código de país. Ejemplo: +58 412 1234567.">
              <input id="vr-phone" className="input" type="tel" inputMode="tel" value={r.transferPhone} onChange={(e) => patch({ transferPhone: e.target.value })} placeholder="+58 412 1234567" />
            </Field>
            <Field label="¿Cuándo transferir?" htmlFor="vr-when">
              <textarea id="vr-when" className="input" rows={2} value={r.transferWhen} onChange={(e) => patch({ transferWhen: e.target.value })} />
            </Field>
          </div>
        )}
      </Section>

      <Section icon={Voicemail} title="Buzón de voz">
        <CheckRow checked={r.voicemailEnabled} onChange={(voicemailEnabled) => patch({ voicemailEnabled })} title="Tomar mensaje si no hay solución inmediata" />
        {r.voicemailEnabled && (
          <div className="fx-field-in" style={{ marginTop: 12 }}>
            <Field label="Mensaje del buzón" htmlFor="vr-vm"><textarea id="vr-vm" className="input" rows={2} value={r.voicemailMessage} onChange={(e) => patch({ voicemailMessage: e.target.value })} /></Field>
          </div>
        )}
      </Section>

      <Section icon={Mic} title="Duración máxima">
        <Field label="Límite por llamada (minutos)" htmlFor="vr-max" hint="Entre 1 y 60. El agente avisa con cortesía antes de cerrar.">
          <input id="vr-max" className="input" type="number" min={1} max={60} value={r.maxMinutes} onChange={(e) => patch({ maxMinutes: Number(e.target.value) || 0 })} style={{ maxWidth: 160 }} />
        </Field>
      </Section>

      <Section icon={Scale} title="Aviso legal y consentimiento">
        <div className="ag-checks">
          <CheckRow checked={r.aiDisclosure} onChange={(aiDisclosure) => patch({ aiDisclosure })} title="Avisar que es una IA" text="Recomendado: al inicio dice que es un asistente de inteligencia artificial." />
          <CheckRow checked={r.recording} onChange={(recording) => patch({ recording })} title="Grabar las llamadas" text="La grabación real se activará con la telefonía." />
          <CheckRow checked={r.consent} onChange={(consent) => patch({ consent })} title="Pedir consentimiento antes de continuar" text="Si la persona se niega, no se graba." />
        </div>
      </Section>
    </>
  );
}
