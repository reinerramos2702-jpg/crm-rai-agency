/** Utilidades puras de fechas (hora local del navegador, semana desde el lunes). */

export const DAY_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] as const;
export const DAY_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;
export const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;
export const MONTH_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

const MS_MINUTE = 60_000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Índice de día con el lunes en 0. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - weekdayIndex(d));
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Clave estable «aaaa-mm-dd» en hora local. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Valor para `<input type="datetime-local">`. */
export function toDateTimeLocal(d: Date): string {
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Interpreta «aaaa-mm-ddThh:mm» como hora local; null si no es una fecha real (p. ej. 31 de febrero). */
export function parseDateTimeLocal(value: string): Date | null {
  const m = LOCAL_RE.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y === undefined || mo === undefined || d === undefined || h === undefined || mi === undefined) return null;
  const date = new Date(y, mo - 1, d, h, mi, 0, 0);
  const same = date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
    && date.getHours() === h && date.getMinutes() === mi;
  return same ? date : null;
}

export function parseIso(value: string): Date | null {
  const d = new Date(value);
  return isValidDate(d) ? d : null;
}

export function fmtTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtTimeRange(start: Date, end: Date): string {
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}

/** «17 oct 2026». */
export function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** «sábado 17 de octubre». */
export function fmtDayLong(d: Date): string {
  return `${DAY_LONG[weekdayIndex(d)]} ${d.getDate()} de ${MONTH_LONG[d.getMonth()]}`;
}

/** Primera letra en mayúscula (el resto se respeta: «sábado 17 de octubre» → «Sábado 17 de octubre»). */
export function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** «Hoy», «Mañana» o «Ayer» respecto de `now`; null en cualquier otro caso. */
export function relativeDayLabel(d: Date, now: Date): string | null {
  const today = startOfDay(now);
  if (isSameDay(d, today)) return 'Hoy';
  if (isSameDay(d, addDays(today, 1))) return 'Mañana';
  if (isSameDay(d, addDays(today, -1))) return 'Ayer';
  return null;
}

/** «12 – 18 oct 2026» o «28 sep – 4 oct 2026». */
export function fmtWeekRange(start: Date): string {
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

/** Al mover el inicio conserva la duración anterior (si era válida; si no, 30 min). */
export function shiftEnd(prevStart: Date | null, prevEnd: Date | null, nextStart: Date): Date {
  const span = prevStart && prevEnd && prevEnd > prevStart ? prevEnd.getTime() - prevStart.getTime() : 30 * MS_MINUTE;
  return new Date(nextStart.getTime() + span);
}

/** Zona horaria válida según Intl (identificadores IANA). */
export function isValidTimeZone(tz: string): boolean {
  if (!tz.trim()) return false;
  try {
    new Intl.DateTimeFormat('es', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Zona horaria del navegador, o null si no se puede determinar. */
export function browserTimeZone(): string | null {
  try {
    const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && isValidTimeZone(tz) ? tz : null;
  } catch {
    return null;
  }
}
