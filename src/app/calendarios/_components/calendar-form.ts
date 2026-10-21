import {
  availabilityToForm, defaultAvailabilityForm, formToAvailability, validateAvailabilityForm,
  type AvailabilityForm,
} from './availability';
import { CALENDAR_TYPES, type CalendarResource } from './calendar-types';
import { templateAvailability, type CalendarTemplate } from './templates';

export const MIN_DURATION = 5;
export const MAX_DURATION = 480;
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 500;
export const DEFAULT_DURATION = 30;

export type DurationResult = { ok: true; value: number } | { ok: false; error: string };

/** Duración en minutos: entero entre 5 y 480. */
export function parseDuration(raw: string): DurationResult {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return { ok: false, error: 'Indica la duración en minutos, con números enteros.' };
  const value = Number(text);
  if (value < MIN_DURATION || value > MAX_DURATION) {
    return { ok: false, error: `La duración debe estar entre ${MIN_DURATION} y ${MAX_DURATION} minutos.` };
  }
  return { ok: true, value };
}

/** «30 min», «1 h», «1 h 30 min». */
export function formatDuration(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export interface CalendarFormState {
  name: string;
  description: string;
  type: string;
  durationMins: string;
  groupId: string;
  bookingEnabled: boolean;
  availability: AvailabilityForm;
}

export type CalendarFormErrors = Partial<Record<'name' | 'description' | 'durationMins' | 'availability', string>>;

export function emptyCalendarForm(groupId = ''): CalendarFormState {
  return {
    name: '',
    description: '',
    type: 'personal',
    durationMins: String(DEFAULT_DURATION),
    groupId,
    bookingEnabled: false,
    availability: defaultAvailabilityForm(),
  };
}

export function calendarToForm(c: CalendarResource): CalendarFormState {
  return {
    name: c.name,
    description: c.description ?? '',
    type: c.type,
    durationMins: String(c.durationMins),
    groupId: c.groupId ?? '',
    bookingEnabled: !!c.bookingEnabled,
    availability: availabilityToForm(c.availability),
  };
}

/** Aplica una plantilla conservando el grupo y la opción de reservas ya elegidos. */
export function applyTemplate(form: CalendarFormState, t: CalendarTemplate): CalendarFormState {
  return {
    ...form,
    name: t.name,
    description: t.description,
    type: t.type,
    durationMins: String(t.durationMins),
    availability: templateAvailability(t),
  };
}

export function validateCalendarForm(form: CalendarFormState): CalendarFormErrors {
  const errors: CalendarFormErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'El nombre del calendario es requerido.';
  else if (name.length > NAME_MAX) errors.name = `Usa máximo ${NAME_MAX} caracteres.`;
  if (form.description.trim().length > DESCRIPTION_MAX) errors.description = `Usa máximo ${DESCRIPTION_MAX} caracteres.`;
  const duration = parseDuration(form.durationMins);
  if (!duration.ok) errors.durationMins = duration.error;
  const availability = validateAvailabilityForm(form.availability);
  if (availability) errors.availability = availability;
  return errors;
}

/** Cuerpo para POST/PATCH `/api/calendars`. Solo se envía `bookingEnabled` al editar (el alta lo ignora). */
export function buildCalendarPayload(form: CalendarFormState, editing: boolean): Record<string, unknown> {
  const duration = parseDuration(form.durationMins);
  const type = CALENDAR_TYPES.some((t) => t.id === form.type) ? form.type : 'personal';
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    type,
    durationMins: duration.ok ? duration.value : DEFAULT_DURATION,
    groupId: form.groupId || null,
    availability: formToAvailability(form.availability),
  };
  if (editing) payload.bookingEnabled = form.bookingEnabled;
  return payload;
}
