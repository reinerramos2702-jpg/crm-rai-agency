import { DAYS, DAY_KEYS, type Availability, type AvailabilityWindow, type DayKey } from './calendar-types';

/** Un día del editor de disponibilidad. */
export interface DayForm {
  enabled: boolean;
  start: string;
  end: string;
}

export type AvailabilityForm = Record<DayKey, DayForm>;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

/** Minutos desde las 00:00, o null si el texto no es «HH:MM». */
export function timeToMinutes(value: string): number | null {
  const m = TIME_RE.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWindow(value: unknown): value is AvailabilityWindow {
  if (!isRecord(value)) return false;
  const { start, end } = value;
  if (typeof start !== 'string' || typeof end !== 'string') return false;
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return s !== null && e !== null && e > s;
}

/** Lee con seguridad el JSON de disponibilidad: descarta días y franjas con formato inválido. */
export function readAvailability(value: unknown): Availability {
  if (!isRecord(value)) return {};
  const out: Availability = {};
  for (const key of DAY_KEYS) {
    const raw = value[key];
    if (Array.isArray(raw)) {
      out[key] = raw.filter(isWindow).map((w) => ({ start: w.start, end: w.end }));
    }
  }
  return out;
}

function dayForm(enabled: boolean, start = '09:00', end = '18:00'): DayForm {
  return { enabled, start, end };
}

/** Lunes a viernes de 09:00 a 18:00; sábado y domingo cerrados. */
export function defaultAvailabilityForm(): AvailabilityForm {
  return {
    mon: dayForm(true), tue: dayForm(true), wed: dayForm(true), thu: dayForm(true), fri: dayForm(true),
    sat: dayForm(false), sun: dayForm(false),
  };
}

export function everyDayAvailabilityForm(): AvailabilityForm {
  return {
    mon: dayForm(true), tue: dayForm(true), wed: dayForm(true), thu: dayForm(true), fri: dayForm(true),
    sat: dayForm(true), sun: dayForm(true),
  };
}

export function clearedAvailabilityForm(): AvailabilityForm {
  return {
    mon: dayForm(false), tue: dayForm(false), wed: dayForm(false), thu: dayForm(false), fri: dayForm(false),
    sat: dayForm(false), sun: dayForm(false),
  };
}

/** Del JSON guardado al formulario (se usa la primera franja de cada día). */
export function availabilityToForm(value: unknown): AvailabilityForm {
  const av = readAvailability(value);
  const form = defaultAvailabilityForm();
  for (const key of DAY_KEYS) {
    const first = av[key]?.[0];
    form[key] = first ? dayForm(true, first.start, first.end) : { ...form[key], enabled: false };
  }
  return form;
}

/** Del formulario al JSON que espera la API: los siete días, vacíos si están cerrados. */
export function formToAvailability(form: AvailabilityForm): Availability {
  const out: Availability = {};
  for (const key of DAY_KEYS) {
    const day = form[key];
    out[key] = day.enabled ? [{ start: day.start, end: day.end }] : [];
  }
  return out;
}

/** Primer problema del formulario de disponibilidad, o null si todo es válido. */
export function validateAvailabilityForm(form: AvailabilityForm): string | null {
  for (const info of DAYS) {
    const day = form[info.key];
    if (!day.enabled) continue;
    const s = timeToMinutes(day.start);
    const e = timeToMinutes(day.end);
    if (s === null || e === null) return `${info.label}: indica una hora de inicio y de fin válidas.`;
    if (e <= s) return `${info.label}: la hora de fin debe ser posterior a la de inicio.`;
  }
  return null;
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}

/** «Lun–Vie», «Lun, Mié y Vie», «Todos los días». */
export function describeDays(days: DayKey[]): string {
  const idx = DAYS.map((d) => d.key).filter((k) => days.includes(k)).map((k) => DAY_KEYS.indexOf(k));
  if (idx.length === 0) return '';
  if (idx.length === 7) return 'Todos los días';
  const short = (i: number) => DAYS[i]?.short ?? '';
  const parts: string[] = [];
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && (idx[j + 1] ?? 0) === (idx[j] ?? 0) + 1) j++;
    const first = idx[i] ?? 0;
    const last = idx[j] ?? 0;
    if (j - i >= 2) parts.push(`${short(first)}–${short(last)}`);
    else for (let k = i; k <= j; k++) parts.push(short(idx[k] ?? 0));
    i = j + 1;
  }
  return joinList(parts);
}

function windowsSignature(windows: AvailabilityWindow[]): string {
  return windows.map((w) => `${w.start}–${w.end}`).join(' y ');
}

/** Resumen legible: «Lun–Vie · 09:00–18:00», «Horario variable · 4 días» o «Sin horarios definidos». */
export function summarizeAvailability(av: Availability): string {
  const active = DAY_KEYS.filter((k) => (av[k]?.length ?? 0) > 0);
  if (active.length === 0) return 'Sin horarios definidos';
  const signatures = new Set(active.map((k) => windowsSignature(av[k] ?? [])));
  if (signatures.size === 1) {
    const [sig] = Array.from(signatures);
    return `${describeDays(active)} · ${sig}`;
  }
  return `Horario variable · ${active.length} ${active.length === 1 ? 'día' : 'días'}`;
}

/** Citas que caben en una semana si se llenan todas las franjas (duración fija, sin solapes). */
export function weeklySlotCount(av: Availability, durationMins: number): number {
  if (!Number.isFinite(durationMins) || durationMins <= 0) return 0;
  let total = 0;
  for (const key of DAY_KEYS) {
    for (const w of av[key] ?? []) {
      const s = timeToMinutes(w.start);
      const e = timeToMinutes(w.end);
      if (s !== null && e !== null && e > s) total += Math.floor((e - s) / durationMins);
    }
  }
  return total;
}

export interface DayBar {
  day: DayKey;
  /** Segmentos verticales en porcentaje del eje (arriba = inicio del eje). */
  segments: Array<{ top: number; height: number }>;
}

export const AXIS_START = 6 * 60;
export const AXIS_END = 22 * 60;

/** Datos para la franja semanal: cada franja horaria recortada al eje 06:00–22:00. */
export function dayBars(av: Availability, axisStart = AXIS_START, axisEnd = AXIS_END): DayBar[] {
  const span = axisEnd - axisStart;
  return DAY_KEYS.map((day) => {
    const segments: DayBar['segments'] = [];
    for (const w of av[day] ?? []) {
      const s = timeToMinutes(w.start);
      const e = timeToMinutes(w.end);
      if (s === null || e === null || span <= 0) continue;
      const from = Math.max(s, axisStart);
      const to = Math.min(e, axisEnd);
      if (to <= from) continue;
      segments.push({ top: ((from - axisStart) / span) * 100, height: ((to - from) / span) * 100 });
    }
    return { day, segments };
  });
}
