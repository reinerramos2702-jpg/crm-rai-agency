'use client';

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cellAppointments, dayAppointments, weekAppointments, type TimedAppointment } from './appointment-logic';
import { calendarTone, type Appointment } from './calendar-types';
import {
  addDays, DAY_LONG, DAY_SHORT, fmtDayLong, fmtTime, fmtTimeRange, fmtWeekRange, isSameDay, startOfDay, startOfWeek, upperFirst,
} from './dates';

/** Horas visibles de la cuadrícula: 06:00 a 23:00. */
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

interface Props {
  items: TimedAppointment[];
  weekStart: Date;
  now: Date;
  onWeekChange: (next: Date) => void;
  onCreate: (start: Date) => void;
  onEdit: (a: Appointment) => void;
}

function Chip({ t, onEdit }: { t: TimedAppointment; onEdit: (a: Appointment) => void }) {
  return (
    <button
      type="button" className="cal-wk-chip" data-tone={calendarTone(t.item.calendarId)}
      title={`${t.item.title} (${fmtTimeRange(t.start, t.end)})`}
      aria-label={`${t.item.title}, ${fmtTimeRange(t.start, t.end)}. Editar`}
      onClick={() => onEdit(t.item)}
    >
      <span className="cal-wk-chip-time">{fmtTime(t.start)}</span> {t.item.title}
    </button>
  );
}

/**
 * Semana: cuadrícula por horas en pantallas anchas y lista de días apilados en las angostas
 * (así nunca hay scroll horizontal entre 320 y 1440 px).
 */
export function WeekView({ items, weekStart, now, onWeekChange, onCreate, onEdit }: Props) {
  const week = useMemo(() => weekAppointments(items, weekStart), [items, weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  function slot(day: Date, hour: number): Date {
    const d = startOfDay(day);
    d.setHours(hour, 0, 0, 0);
    return d;
  }

  return (
    <div className="cal-week">
      <div className="cal-week-nav">
        <div className="cal-week-btns">
          <button type="button" className="ghost btn-sm cal-icon-btn" aria-label="Semana anterior" onClick={() => onWeekChange(addDays(weekStart, -7))}>
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button type="button" className="ghost btn-sm" onClick={() => onWeekChange(startOfWeek(new Date()))}>Hoy</button>
          <button type="button" className="ghost btn-sm cal-icon-btn" aria-label="Semana siguiente" onClick={() => onWeekChange(addDays(weekStart, 7))}>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
        <h2 className="cal-week-range" aria-live="polite">{fmtWeekRange(weekStart)}</h2>
      </div>

      <div className="card cal-wk-grid-card">
        <div className="cal-wk-grid" role="group" aria-label="Cuadrícula semanal de citas">
          <div className="cal-wk-corner" />
          {days.map((d, i) => (
            <div key={d.toISOString()} className={`cal-wk-head${isSameDay(d, now) ? ' is-today' : ''}`}>
              <span>{DAY_SHORT[i]}</span>
              <strong>{d.getDate()}</strong>
            </div>
          ))}
          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              <div className="cal-wk-hour">{String(hour).padStart(2, '0')}:00</div>
              {days.map((d) => {
                const here = cellAppointments(week, d, hour);
                return (
                  <div key={d.toISOString() + hour} className="cal-wk-cell">
                    {here.length === 0 ? (
                      <button
                        type="button" tabIndex={-1} className="cal-wk-add"
                        aria-label={`Agendar el ${fmtDayLong(d)} a las ${String(hour).padStart(2, '0')}:00`}
                        onClick={() => onCreate(slot(d, hour))}
                      >
                        <Plus size={12} aria-hidden="true" />
                      </button>
                    ) : here.map((t) => <Chip key={t.item.id} t={t} onEdit={onEdit} />)}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <ul className="cal-wk-days">
        {days.map((d, i) => {
          const list = dayAppointments(week, d);
          return (
            <li key={d.toISOString()} className={`card cal-wk-day${isSameDay(d, now) ? ' is-today' : ''}`}>
              <div className="cal-wk-day-head">
                <h3><span>{upperFirst(DAY_LONG[i] ?? '')}</span> <strong>{d.getDate()}</strong></h3>
                <button type="button" className="ghost btn-sm" onClick={() => onCreate(slot(d, 9))} aria-label={`Agendar una cita el ${fmtDayLong(d)}`}>
                  <Plus size={13} aria-hidden="true" /> Agendar
                </button>
              </div>
              {list.length === 0 ? (
                <p className="cal-wk-none">Sin citas</p>
              ) : (
                <div className="cal-wk-day-items">{list.map((t) => <Chip key={t.item.id} t={t} onEdit={onEdit} />)}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
