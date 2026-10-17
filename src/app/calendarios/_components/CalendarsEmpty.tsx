import React from 'react';
import { CalendarCheck, Handshake, Link2, PhoneCall, Plus, Stethoscope, Users, type LucideIcon } from 'lucide-react';
import { formatDuration } from './calendar-form';
import { describeDays } from './availability';
import { DAYS } from './calendar-types';
import { CALENDAR_TEMPLATES, type CalendarTemplate } from './templates';

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  consulta: Stethoscope,
  'reunion-ventas': Handshake,
  'llamada-descubrimiento': PhoneCall,
};

const BENEFITS = [
  { icon: CalendarCheck, title: 'Disponibilidad semanal', text: 'Define los días y horarios en que aceptas citas.' },
  { icon: Link2, title: 'Enlace de reserva', text: 'Comparte una página pública para que agenden solos.' },
  { icon: Users, title: 'Citas con contactos', text: 'Cada cita queda vinculada a tu base de contactos.' },
];

/** Celdas del mini-calendario fantasma que muestran un chip (índice → tono). */
const GHOST_CHIPS: Readonly<Record<number, 'gold' | 'purple' | 'ok'>> = {
  2: 'gold', 8: 'purple', 9: 'gold', 15: 'ok', 16: 'gold', 22: 'purple', 24: 'gold',
};

/** Vista previa «fantasma»: anticipa cómo se verá el calendario con citas. Decorativa. */
function GhostCalendar() {
  return (
    <div className="cal-ghost" aria-hidden="true">
      <div className="cal-ghost-head">
        <i className="cal-ghost-title" />
        <span className="cal-ghost-nav"><i /><i /></span>
      </div>
      <div className="cal-ghost-week">
        {DAYS.map((d) => <span key={d.key}>{d.short}</span>)}
      </div>
      <div className="cal-ghost-grid">
        {Array.from({ length: 35 }, (_, i) => {
          const tone = GHOST_CHIPS[i];
          return (
            <div key={i} className="cal-ghost-cell">
              {tone && <i className="cal-ghost-chip" data-tone={tone} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function templateMeta(t: CalendarTemplate): string {
  return `${formatDuration(t.durationMins)} · ${describeDays([...t.days])} ${t.start}–${t.end}`;
}

/** Estado vacío de Calendarios: vista previa, plantillas de arranque y creación desde cero. */
export function CalendarsEmpty({ onCreate }: { onCreate: (template: CalendarTemplate | null) => void }) {
  return (
    <section className="card cal-empty" aria-labelledby="cal-empty-title">
      <GhostCalendar />

      <div className="cal-empty-copy">
        <h3 id="cal-empty-title" className="cal-empty-title">Aún no tienes calendarios</h3>
        <p className="cal-empty-text">
          Crea tu primer calendario para recibir citas: define tu disponibilidad, la duración de cada cita y, si quieres,
          un enlace público de reserva.
        </p>
      </div>

      <div className="cal-templates" role="group" aria-label="Empezar con una plantilla">
        <p className="cal-templates-label">Empieza con una plantilla</p>
        <div className="cal-templates-grid">
          {CALENDAR_TEMPLATES.map((t) => {
            const Icon = TEMPLATE_ICONS[t.id] ?? CalendarCheck;
            return (
              <button key={t.id} type="button" className="cal-tpl" onClick={() => onCreate(t)}>
                <span className="cal-tpl-icon" aria-hidden="true"><Icon size={16} /></span>
                <strong>{t.label}</strong>
                <span className="cal-tpl-sum">{t.summary}</span>
                <span className="cal-tpl-meta">{templateMeta(t)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" className="primary" onClick={() => onCreate(null)}>
        <Plus size={14} aria-hidden="true" /> Crear el primero desde cero
      </button>

      <ul className="cal-benefits">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="cal-benefit">
            <span className="cal-benefit-icon" aria-hidden="true"><Icon size={16} /></span>
            <strong>{title}</strong>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
