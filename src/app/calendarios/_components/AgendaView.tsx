'use client';

import React, { useMemo } from 'react';
import { AppointmentRow } from './AppointmentRow';
import { groupByDay, type TimedAppointment } from './appointment-logic';
import type { Appointment } from './calendar-types';
import { fmtDayLong, relativeDayLabel, upperFirst } from './dates';

interface Props {
  items: TimedAppointment[];
  now: Date;
  onEdit: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
  onDelete: (a: Appointment) => void;
}

/** Agenda: las citas filtradas agrupadas por día. */
export function AgendaView({ items, now, onEdit, onCancel, onDelete }: Props) {
  const groups = useMemo(() => groupByDay(items), [items]);
  return (
    <div className="cal-agenda">
      {groups.map((g) => {
        const rel = relativeDayLabel(g.date, now);
        const year = g.date.getFullYear() !== now.getFullYear() ? `, ${g.date.getFullYear()}` : '';
        const titleId = `cal-day-${g.key}`;
        return (
          <section key={g.key} className="cal-agenda-day" aria-labelledby={titleId}>
            <h2 id={titleId} className="cal-agenda-day-title">
              {rel && <span className="cal-agenda-rel">{rel}</span>}
              <span>{upperFirst(fmtDayLong(g.date))}{year}</span>
              <span className="cal-count" aria-label={`${g.items.length} citas`}>{g.items.length}</span>
            </h2>
            <ul className="cal-appt-list">
              {g.items.map((t) => (
                <AppointmentRow key={t.item.id} t={t} onEdit={onEdit} onCancel={onCancel} onDelete={onDelete} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
