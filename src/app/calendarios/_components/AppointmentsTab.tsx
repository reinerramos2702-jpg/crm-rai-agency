'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, List, Plus, RotateCw, SearchX, TriangleAlert } from 'lucide-react';
import { AgendaView } from './AgendaView';
import { AppointmentFilterBar } from './AppointmentFilters';
import { AppointmentsEmpty } from './AppointmentsEmpty';
import { AgendaSkeleton } from './CalendarsSkeleton';
import { WeekView } from './WeekView';
import {
  applyFilters, countByStatus, DEFAULT_FILTERS, filterByScope, withTimes, type AppointmentFilters,
} from './appointment-logic';
import { startOfWeek } from './dates';
import type { OpenModal } from './modal-state';
import type { CalendarActions } from './use-calendar-actions';
import type { CalendarData } from './use-calendar-data';
import { useNow } from './use-now';

type View = 'agenda' | 'semana';

interface Props {
  data: CalendarData;
  actions: CalendarActions;
  openModal: OpenModal;
  onGoToCalendars: () => void;
}

/** Pestaña «Citas»: agenda por día con filtros, o semana. */
export function AppointmentsTab({ data, actions, openModal, onGoToCalendars }: Props) {
  const { appointments, calendars } = data;
  const [view, setView] = useState<View>('agenda');
  const [filters, setFilters] = useState<AppointmentFilters>(DEFAULT_FILTERS);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const timed = useMemo(() => withTimes(appointments.items), [appointments.items]);
  const now = useNow();
  const scoped = useMemo(() => filterByScope(timed, filters, now), [timed, filters, now]);
  const counts = useMemo(() => countByStatus(scoped, now), [scoped, now]);
  const visible = useMemo(() => applyFilters(timed, filters, now), [timed, filters, now]);
  const calendarScoped = useMemo(
    () => (filters.calendarId ? timed.filter((t) => t.item.calendarId === filters.calendarId) : timed),
    [timed, filters.calendarId],
  );

  const hasCalendars = calendars.items.length > 0;
  const create = (start?: Date) => openModal({ kind: 'appointment', appointment: null, prefill: start ? { start } : {} });

  let body: React.ReactNode;
  if (appointments.loading) {
    body = <AgendaSkeleton />;
  } else if (appointments.failed) {
    body = (
      <div className="card cal-state" role="alert">
        <TriangleAlert size={28} aria-hidden="true" />
        <h2 className="cal-state-title">No se pudieron cargar las citas</h2>
        <p className="cal-state-text">Revisa tu conexión e inténtalo de nuevo. No se perdió ningún dato.</p>
        <button type="button" className="primary" onClick={() => void appointments.refresh()}>
          <RotateCw size={14} aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  } else if (view === 'semana') {
    body = (
      <WeekView
        items={calendarScoped} weekStart={weekStart} now={now} onWeekChange={setWeekStart}
        onCreate={create} onEdit={(a) => openModal({ kind: 'appointment', appointment: a, prefill: {} })}
      />
    );
  } else if (appointments.items.length === 0) {
    body = <AppointmentsEmpty hasCalendars={hasCalendars} onCreate={() => create()} onGoToCalendars={onGoToCalendars} />;
  } else if (visible.length === 0) {
    body = (
      <div className="card cal-state">
        <SearchX size={28} aria-hidden="true" />
        <h2 className="cal-state-title">Ninguna cita coincide con los filtros</h2>
        <p className="cal-state-text">Prueba con otro estado, fecha o calendario.</p>
        <button type="button" className="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>Restablecer filtros</button>
      </div>
    );
  } else {
    body = (
      <AgendaView
        items={visible} now={now}
        onEdit={(a) => openModal({ kind: 'appointment', appointment: a, prefill: {} })}
        onCancel={(a) => void actions.cancelAppointment(a)}
        onDelete={(a) => openModal({ kind: 'delete-appointment', appointment: a })}
      />
    );
  }

  return (
    <div className="cal-cq">
      <div className="cal-toolbar">
        <div className="cal-seg" role="group" aria-label="Vista de citas">
          <button type="button" aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>
            <List size={14} aria-hidden="true" /> Agenda
          </button>
          <button type="button" aria-pressed={view === 'semana'} onClick={() => setView('semana')}>
            <CalendarDays size={14} aria-hidden="true" /> Semana
          </button>
        </div>
        <button type="button" className="primary" onClick={() => create()}>
          <Plus size={14} aria-hidden="true" /> Nueva cita
        </button>
      </div>

      {appointments.stale && (
        <p className="cal-banner cal-banner--err" role="alert">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>No se pudo actualizar la lista. Mostrando lo último guardado.</span>
          <button type="button" className="ghost btn-sm" onClick={() => void appointments.refresh()}>Reintentar</button>
        </p>
      )}

      {!appointments.loading && !appointments.failed && appointments.items.length > 0 && (
        <>
          <AppointmentFilterBar
            filters={filters} onChange={setFilters} counts={counts} calendars={calendars.items}
            calendarOnly={view === 'semana'}
          />
          {view === 'agenda' && (
            <p className="cal-result-count" aria-live="polite">
              {visible.length === 1 ? '1 cita' : `${visible.length} citas`}
            </p>
          )}
        </>
      )}

      {body}
    </div>
  );
}
