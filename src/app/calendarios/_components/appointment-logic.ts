import { isAppointmentStatus, type Appointment } from './calendar-types';
import {
  addDays, dayKey, isSameDay, isValidDate, parseDateTimeLocal, startOfDay, startOfWeek,
} from './dates';

export type StatusFilter = 'proximo' | 'cancelado' | 'completado' | 'no_asistio' | 'todos';
export type RangeFilter = 'todo' | 'hoy' | 'semana' | '30d';

export interface AppointmentFilters {
  status: StatusFilter;
  range: RangeFilter;
  /** Id del calendario; vacío = todos. */
  calendarId: string;
}

export const DEFAULT_FILTERS: AppointmentFilters = { status: 'proximo', range: 'todo', calendarId: '' };

export const STATUS_FILTERS: ReadonlyArray<{ id: StatusFilter; label: string }> = [
  { id: 'proximo', label: 'Próximas' },
  { id: 'completado', label: 'Completadas' },
  { id: 'no_asistio', label: 'No asistió' },
  { id: 'cancelado', label: 'Canceladas' },
  { id: 'todos', label: 'Todas' },
];

export const RANGE_FILTERS: ReadonlyArray<{ id: RangeFilter; label: string }> = [
  { id: 'todo', label: 'Cualquier fecha' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: '30d', label: 'Próximos 30 días' },
];

/** Cita con fechas válidas ya interpretadas. */
export interface TimedAppointment {
  item: Appointment;
  start: Date;
  end: Date;
}

export function withTimes(list: readonly Appointment[]): TimedAppointment[] {
  const out: TimedAppointment[] = [];
  for (const item of list) {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    if (isValidDate(start) && isValidDate(end)) out.push({ item, start, end });
  }
  return out;
}

function matchesStatus(t: TimedAppointment, status: StatusFilter, now: Date): boolean {
  switch (status) {
    case 'todos': return true;
    case 'cancelado': return t.item.status === 'cancelled';
    case 'completado': return t.item.status === 'completed';
    case 'no_asistio': return t.item.status === 'no_show';
    case 'proximo': return t.item.status !== 'cancelled' && t.end >= now;
  }
}

function matchesRange(t: TimedAppointment, range: RangeFilter, now: Date): boolean {
  switch (range) {
    case 'todo': return true;
    case 'hoy': return isSameDay(t.start, now);
    case 'semana': {
      const from = startOfWeek(now);
      return t.start >= from && t.start < addDays(from, 7);
    }
    case '30d': {
      const from = startOfDay(now);
      return t.start >= from && t.start < addDays(from, 30);
    }
  }
}

/** Citas que cumplen el rango y el calendario (sin mirar el estado): base para los contadores por estado. */
export function filterByScope(list: readonly TimedAppointment[], f: AppointmentFilters, now: Date): TimedAppointment[] {
  return list.filter((t) => matchesRange(t, f.range, now) && (!f.calendarId || t.item.calendarId === f.calendarId));
}

/** Contadores por filtro de estado dentro del rango y calendario elegidos. */
export function countByStatus(scoped: readonly TimedAppointment[], now: Date): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { proximo: 0, cancelado: 0, completado: 0, no_asistio: 0, todos: scoped.length };
  for (const t of scoped) {
    if (matchesStatus(t, 'proximo', now)) counts.proximo++;
    if (t.item.status === 'cancelled') counts.cancelado++;
    if (t.item.status === 'completed') counts.completado++;
    if (t.item.status === 'no_show') counts.no_asistio++;
  }
  return counts;
}

/**
 * Aplica los tres filtros. «Próximas» va de la más cercana a la más lejana;
 * el resto, de la más reciente a la más antigua.
 */
export function applyFilters(list: readonly TimedAppointment[], f: AppointmentFilters, now: Date): TimedAppointment[] {
  const out = filterByScope(list, f, now).filter((t) => matchesStatus(t, f.status, now));
  const dir = f.status === 'proximo' ? 1 : -1;
  return out.sort((a, b) => dir * (a.start.getTime() - b.start.getTime()));
}

export interface DayGroup {
  key: string;
  date: Date;
  items: TimedAppointment[];
}

/** Agrupa por día local respetando el orden de entrada. */
export function groupByDay(list: readonly TimedAppointment[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const index = new Map<string, DayGroup>();
  for (const t of list) {
    const key = dayKey(t.start);
    let group = index.get(key);
    if (!group) {
      group = { key, date: startOfDay(t.start), items: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.items.push(t);
  }
  return groups;
}

/** Citas de la semana (sin canceladas), ordenadas por hora. */
export function weekAppointments(list: readonly TimedAppointment[], weekStart: Date): TimedAppointment[] {
  const end = addDays(weekStart, 7);
  return list
    .filter((t) => t.item.status !== 'cancelled' && t.start >= weekStart && t.start < end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Citas que empiezan en `day` a la hora `hour` (celda de la cuadrícula semanal). */
export function cellAppointments(week: readonly TimedAppointment[], day: Date, hour: number): TimedAppointment[] {
  return week.filter((t) => isSameDay(t.start, day) && t.start.getHours() === hour);
}

export function dayAppointments(week: readonly TimedAppointment[], day: Date): TimedAppointment[] {
  return week.filter((t) => isSameDay(t.start, day));
}

/** Citas confirmadas que aún no terminan, por calendario. */
export function upcomingCountByCalendar(list: readonly TimedAppointment[], now: Date): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of list) {
    if (t.item.status === 'confirmed' && t.end >= now) counts[t.item.calendarId] = (counts[t.item.calendarId] ?? 0) + 1;
  }
  return counts;
}

export interface AppointmentFormState {
  calendarId: string;
  contactId: string;
  title: string;
  notes: string;
  start: string;
  end: string;
  status: string;
}

export type AppointmentErrors = Partial<Record<'title' | 'calendarId' | 'start' | 'end', string>>;

export const TITLE_MAX = 160;
export const NOTES_MAX = 1000;

export interface AppointmentValidation {
  errors: AppointmentErrors;
  start: Date | null;
  end: Date | null;
}

export function validateAppointmentForm(f: AppointmentFormState): AppointmentValidation {
  const errors: AppointmentErrors = {};
  const title = f.title.trim();
  if (!title) errors.title = 'El título de la cita es requerido.';
  else if (title.length > TITLE_MAX) errors.title = `Usa máximo ${TITLE_MAX} caracteres.`;
  if (!f.calendarId) errors.calendarId = 'Selecciona un calendario.';
  const start = parseDateTimeLocal(f.start);
  const end = parseDateTimeLocal(f.end);
  if (!start) errors.start = 'Indica una fecha y hora de inicio válidas.';
  if (!end) errors.end = 'Indica una fecha y hora de fin válidas.';
  if (start && end && end <= start) errors.end = 'La hora de fin debe ser posterior a la hora de inicio.';
  return { errors, start, end };
}

/** Cuerpo para POST/PATCH `/api/appointments`. */
export function buildAppointmentPayload(f: AppointmentFormState, start: Date, end: Date): Record<string, unknown> {
  return {
    calendarId: f.calendarId,
    contactId: f.contactId || null,
    title: f.title.trim(),
    notes: f.notes.trim().slice(0, NOTES_MAX) || null,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status: isAppointmentStatus(f.status) ? f.status : 'confirmed',
  };
}
