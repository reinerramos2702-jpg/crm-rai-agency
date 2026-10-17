'use client';

import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { sendJson } from './calendar-api';
import type { Appointment, CalendarResource } from './calendar-types';
import type { CalendarData } from './use-calendar-data';

export interface CalendarActions {
  afterGroupChange: () => void;
  afterCalendarChange: () => void;
  afterCalendarDelete: () => void;
  afterAppointmentChange: () => void;
  toggleCalendarStatus: (c: CalendarResource) => Promise<void>;
  cancelAppointment: (a: Appointment) => Promise<void>;
}

/** Acciones rápidas (sin diálogo) y recargas coordinadas tras cada cambio. */
export function useCalendarActions({ groups, calendars, appointments }: CalendarData): CalendarActions {
  const refreshGroups = groups.refresh;
  const refreshCalendars = calendars.refresh;
  const refreshAppointments = appointments.refresh;

  return useMemo<CalendarActions>(() => ({
    afterGroupChange: () => { void refreshGroups(); void refreshCalendars(); },
    afterCalendarChange: () => { void refreshCalendars(); void refreshGroups(); },
    afterCalendarDelete: () => { void refreshCalendars(); void refreshGroups(); void refreshAppointments(); },
    afterAppointmentChange: () => { void refreshAppointments(); },
    async toggleCalendarStatus(c) {
      const next = c.status === 'active' ? 'inactive' : 'active';
      const error = await sendJson(`/api/calendars/${c.id}`, 'PATCH', { status: next });
      if (error) { toast.error(error); return; }
      toast.success(next === 'active' ? 'Calendario activado.' : 'Calendario desactivado.');
      void refreshCalendars();
    },
    async cancelAppointment(a) {
      const error = await sendJson(`/api/appointments/${a.id}`, 'PATCH', { status: 'cancelled' });
      if (error) { toast.error(error); return; }
      toast.success('Cita cancelada.');
      void refreshAppointments();
    },
  }), [refreshGroups, refreshCalendars, refreshAppointments]);
}
