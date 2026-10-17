import React, { useMemo } from 'react';
import { dayBars, summarizeAvailability, weeklySlotCount } from './availability';
import { DAYS, type Availability } from './calendar-types';

/** Franja semanal: una columna por día con las horas disponibles (eje 06:00–22:00) y un resumen en texto. */
export function AvailabilityStrip({ availability, durationMins }: { availability: Availability; durationMins: number }) {
  const bars = useMemo(() => dayBars(availability), [availability]);
  const summary = summarizeAvailability(availability);
  const slots = weeklySlotCount(availability, durationMins);
  return (
    <div className="cal-avail" role="img" aria-label={`Disponibilidad semanal: ${summary}`}>
      <div className="cal-avail-bars" aria-hidden="true">
        {bars.map((bar, i) => (
          <div key={bar.day} className="cal-avail-day">
            <span className="cal-avail-track">
              {bar.segments.map((s, j) => (
                <i key={j} style={{ top: `${s.top}%`, height: `${s.height}%` }} />
              ))}
            </span>
            <span className="cal-avail-initial">{DAYS[i]?.initial}</span>
          </div>
        ))}
      </div>
      <div className="cal-avail-text" aria-hidden="true">
        <strong>{summary}</strong>
        <span>{slots > 0 ? `Hasta ${slots} ${slots === 1 ? 'cita' : 'citas'} por semana` : 'Sin cupos semanales'}</span>
      </div>
    </div>
  );
}
