import { describe, expect, it } from 'vitest';
import {
  applyFilters, buildAppointmentPayload, cellAppointments, countByStatus, DEFAULT_FILTERS, dayAppointments, filterByScope,
  groupByDay, upcomingCountByCalendar, validateAppointmentForm, weekAppointments, withTimes,
  type AppointmentFormState, type AppointmentFilters,
} from './appointment-logic';
import type { Appointment } from './calendar-types';

const NOW = new Date(2026, 9, 17, 12, 0); // sábado 17 oct 2026, 12:00

function appt(id: string, start: Date, mins: number, over: Partial<Appointment> = {}): Appointment {
  return {
    id, title: `Cita ${id}`, notes: null, status: 'confirmed', calendarId: 'c1',
    startTime: start.toISOString(), endTime: new Date(start.getTime() + mins * 60_000).toISOString(),
    calendar: { id: 'c1', name: 'Ventas' }, contact: null, ...over,
  };
}

const LIST: Appointment[] = [
  appt('pasada', new Date(2026, 9, 10, 9, 0), 30, { status: 'completed' }),
  appt('hoy-am', new Date(2026, 9, 17, 9, 0), 30), // ya terminó
  appt('hoy-pm', new Date(2026, 9, 17, 15, 0), 30),
  appt('manana', new Date(2026, 9, 18, 10, 0), 60, { calendarId: 'c2' }),
  appt('cancelada', new Date(2026, 9, 19, 10, 0), 30, { status: 'cancelled' }),
  appt('lejana', new Date(2026, 10, 30, 10, 0), 30),
  appt('noshow', new Date(2026, 9, 5, 10, 0), 30, { status: 'no_show' }),
];
const timed = withTimes(LIST);
const ids = (f: Partial<AppointmentFilters>) => applyFilters(timed, { ...DEFAULT_FILTERS, ...f }, NOW).map((t) => t.item.id);

describe('withTimes', () => {
  it('descarta citas con fechas inválidas', () => {
    const bad = { ...appt('x', NOW, 30), startTime: 'no-es-fecha' };
    expect(withTimes([bad, appt('y', NOW, 30)]).map((t) => t.item.id)).toEqual(['y']);
  });
});

describe('filtros', () => {
  it('«próximas» excluye canceladas y terminadas, de la más cercana a la más lejana', () => {
    expect(ids({})).toEqual(['hoy-pm', 'manana', 'lejana']);
  });
  it('estados', () => {
    expect(ids({ status: 'cancelado' })).toEqual(['cancelada']);
    expect(ids({ status: 'completado' })).toEqual(['pasada']);
    expect(ids({ status: 'no_asistio' })).toEqual(['noshow']);
  });
  it('«todas» va de la más reciente a la más antigua', () => {
    expect(ids({ status: 'todos' })).toEqual(['lejana', 'cancelada', 'manana', 'hoy-pm', 'hoy-am', 'pasada', 'noshow']);
  });
  it('rangos', () => {
    expect(ids({ status: 'todos', range: 'hoy' })).toEqual(['hoy-pm', 'hoy-am']);
    expect(ids({ status: 'todos', range: 'semana' })).toEqual(['manana', 'hoy-pm', 'hoy-am']);
    expect(ids({ status: 'todos', range: '30d' })).toEqual(['cancelada', 'manana', 'hoy-pm', 'hoy-am']);
  });
  it('calendario', () => {
    expect(ids({ status: 'todos', calendarId: 'c2' })).toEqual(['manana']);
  });
  it('los contadores respetan rango y calendario pero no el estado', () => {
    const counts = countByStatus(filterByScope(timed, DEFAULT_FILTERS, NOW), NOW);
    expect(counts).toEqual({ proximo: 3, cancelado: 1, completado: 1, no_asistio: 1, todos: 7 });
    const today = countByStatus(filterByScope(timed, { ...DEFAULT_FILTERS, range: 'hoy' }, NOW), NOW);
    expect(today).toEqual({ proximo: 1, cancelado: 0, completado: 0, no_asistio: 0, todos: 2 });
  });
});

describe('agrupación por día', () => {
  it('agrupa por día local conservando el orden', () => {
    const groups = groupByDay(applyFilters(timed, { ...DEFAULT_FILTERS, status: 'todos', range: 'semana' }, NOW));
    expect(groups.map((g) => g.key)).toEqual(['2026-10-18', '2026-10-17']);
    expect(groups[1]?.items.map((t) => t.item.id)).toEqual(['hoy-pm', 'hoy-am']);
  });
});

describe('semana', () => {
  const monday = new Date(2026, 9, 12);
  it('excluye canceladas y otras semanas, ordenadas por hora', () => {
    expect(weekAppointments(timed, monday).map((t) => t.item.id)).toEqual(['hoy-am', 'hoy-pm', 'manana']);
  });
  it('encuentra las citas de una celda y de un día', () => {
    const week = weekAppointments(timed, monday);
    expect(cellAppointments(week, new Date(2026, 9, 17), 15).map((t) => t.item.id)).toEqual(['hoy-pm']);
    expect(cellAppointments(week, new Date(2026, 9, 17), 16)).toEqual([]);
    expect(dayAppointments(week, new Date(2026, 9, 17)).map((t) => t.item.id)).toEqual(['hoy-am', 'hoy-pm']);
  });
});

describe('upcomingCountByCalendar', () => {
  it('cuenta solo confirmadas que no terminaron', () => {
    expect(upcomingCountByCalendar(timed, NOW)).toEqual({ c1: 2, c2: 1 });
  });
});

describe('formulario de cita', () => {
  const form: AppointmentFormState = {
    calendarId: 'c1', contactId: '', title: '  Llamada  ', notes: ' ', start: '2026-10-17T10:00', end: '2026-10-17T10:30', status: 'confirmed',
  };
  it('valida un formulario correcto', () => {
    const v = validateAppointmentForm(form);
    expect(v.errors).toEqual({});
    expect(v.start).toBeInstanceOf(Date);
    if (v.start && v.end) {
      const payload = buildAppointmentPayload(form, v.start, v.end);
      expect(payload).toMatchObject({ calendarId: 'c1', contactId: null, title: 'Llamada', notes: null, status: 'confirmed' });
      expect(payload.startTime).toBe(v.start.toISOString());
    }
  });
  it('señala cada problema', () => {
    const v = validateAppointmentForm({ ...form, title: ' ', calendarId: '', start: '', end: '2026-10-17T09:00' });
    expect(v.errors).toMatchObject({
      title: 'El título de la cita es requerido.',
      calendarId: 'Selecciona un calendario.',
      start: 'Indica una fecha y hora de inicio válidas.',
    });
    expect(validateAppointmentForm({ ...form, end: '2026-10-17T09:00' }).errors.end)
      .toBe('La hora de fin debe ser posterior a la hora de inicio.');
  });
  it('un estado desconocido se envía como confirmada', () => {
    const v = validateAppointmentForm(form);
    if (v.start && v.end) expect(buildAppointmentPayload({ ...form, status: 'otro' }, v.start, v.end).status).toBe('confirmed');
  });
});
