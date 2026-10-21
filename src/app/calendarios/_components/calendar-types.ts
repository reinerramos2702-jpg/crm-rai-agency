/** Tipos y catálogos del módulo Calendarios (sin lógica de red ni de React). */

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export interface DayInfo {
  key: DayKey;
  label: string;
  /** Abreviatura con mayúscula inicial: «Lun». */
  short: string;
  /** Inicial para la franja semanal compacta. */
  initial: string;
}

/** Días de la semana, lunes primero. */
export const DAYS: readonly DayInfo[] = [
  { key: 'mon', label: 'Lunes', short: 'Lun', initial: 'L' },
  { key: 'tue', label: 'Martes', short: 'Mar', initial: 'M' },
  { key: 'wed', label: 'Miércoles', short: 'Mié', initial: 'X' },
  { key: 'thu', label: 'Jueves', short: 'Jue', initial: 'J' },
  { key: 'fri', label: 'Viernes', short: 'Vie', initial: 'V' },
  { key: 'sat', label: 'Sábado', short: 'Sáb', initial: 'S' },
  { key: 'sun', label: 'Domingo', short: 'Dom', initial: 'D' },
];

export interface AvailabilityWindow {
  /** «HH:MM» (24 h). */
  start: string;
  end: string;
}

export type Availability = Partial<Record<DayKey, AvailabilityWindow[]>>;

export interface CalendarResource {
  id: string;
  name: string;
  description: string | null;
  type: string;
  durationMins: number;
  status: string;
  groupId: string | null;
  group?: { id: string; name: string } | null;
  bookingEnabled?: boolean;
  bookingSlug?: string | null;
  /** JSON libre en la base de datos: se interpreta con `readAvailability`. */
  availability?: unknown;
  updatedAt: string;
}

export interface CalendarGroup {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  template: string;
  calendars?: Array<{ id: string }>;
}

export interface Contact {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  startTime: string;
  endTime: string;
  calendarId: string;
  calendar: { id: string; name: string } | null;
  contact: Contact | null;
}

export interface CalendarSettings {
  calendarHideEventDetails?: boolean;
}

export type CalendarTypeId = 'personal' | 'evento' | 'colectivo';

export const CALENDAR_TYPES: ReadonlyArray<{ id: CalendarTypeId; label: string }> = [
  { id: 'personal', label: 'Personal' },
  { id: 'evento', label: 'Evento' },
  { id: 'colectivo', label: 'Colectivo' },
];

export const GROUP_TEMPLATES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'neo', label: 'Neo' },
  { id: 'classic', label: 'Clásica' },
];

export const APPOINTMENT_STATUSES = ['confirmed', 'completed', 'no_show', 'cancelled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmada',
  completed: 'Completada',
  no_show: 'No asistió',
  cancelled: 'Cancelada',
};

export type Tone = 'gold' | 'purple' | 'ok' | 'warn' | 'danger' | 'muted';

const STATUS_TONES: Record<AppointmentStatus, Tone> = {
  confirmed: 'ok',
  completed: 'gold',
  no_show: 'muted',
  cancelled: 'danger',
};

export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

export function statusLabel(status: string): string {
  return isAppointmentStatus(status) ? STATUS_LABELS[status] : status;
}

export function statusTone(status: string): Tone {
  return isAppointmentStatus(status) ? STATUS_TONES[status] : 'muted';
}

export function typeLabel(type: string): string {
  return CALENDAR_TYPES.find((t) => t.id === type)?.label ?? type;
}

const CALENDAR_TONES: readonly Tone[] = ['gold', 'purple', 'ok', 'warn'];

/** Color estable por calendario (la base de datos no guarda color): mismo id, mismo tono. */
export function calendarTone(seed: string): Tone {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return CALENDAR_TONES[hash % CALENDAR_TONES.length] ?? 'gold';
}
