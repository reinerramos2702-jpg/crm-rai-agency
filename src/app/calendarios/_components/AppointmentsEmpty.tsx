import React from 'react';
import { CalendarClock, Plus } from 'lucide-react';

/** Fila fantasma: anticipa cómo se verá una cita. Decorativa. */
function GhostRow({ tone }: { tone: 'gold' | 'purple' | 'ok' }) {
  return (
    <div className="cal-ghost-appt" data-tone={tone}>
      <span className="cal-ghost-time"><i /><i /></span>
      <span className="cal-ghost-lines"><i /><i /></span>
      <i className="cal-ghost-pill" />
    </div>
  );
}

interface Props {
  hasCalendars: boolean;
  onCreate: () => void;
  onGoToCalendars: () => void;
}

/** Estado vacío de Citas: vista previa de la agenda y el siguiente paso según haya calendarios o no. */
export function AppointmentsEmpty({ hasCalendars, onCreate, onGoToCalendars }: Props) {
  return (
    <section className="card cal-empty" aria-labelledby="cal-appt-empty-title">
      <div className="cal-ghost-agenda" aria-hidden="true">
        <GhostRow tone="gold" />
        <GhostRow tone="purple" />
        <GhostRow tone="ok" />
      </div>
      <div className="cal-empty-copy">
        <h2 id="cal-appt-empty-title" className="cal-empty-title">Aún no hay citas</h2>
        <p className="cal-empty-text">
          {hasCalendars
            ? 'Agenda la primera cita o comparte el enlace de reserva de un calendario para que tus contactos agenden solos.'
            : 'Para agendar citas primero necesitas un calendario con su duración y disponibilidad.'}
        </p>
      </div>
      {hasCalendars ? (
        <button type="button" className="primary" onClick={onCreate}>
          <Plus size={14} aria-hidden="true" /> Nueva cita
        </button>
      ) : (
        <button type="button" className="primary" onClick={onGoToCalendars}>
          <CalendarClock size={14} aria-hidden="true" /> Ir a Calendarios
        </button>
      )}
    </section>
  );
}
