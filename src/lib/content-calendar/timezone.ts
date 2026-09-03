/**
 * Helpers de zona horaria para el Calendario de Contenido.
 *
 * Todo se guarda en UTC en la base (`ContentPost.scheduledFor`), pero el
 * cliente piensa y trabaja en SU zona horaria (default `America/Caracas`).
 * Estos helpers convierten en las dos direcciones sin dependencias externas,
 * usando `Intl.DateTimeFormat`, que está disponible tanto en Node como en el
 * navegador — así el mismo archivo sirve en API routes y en componentes.
 */

/** Zona horaria por defecto del producto. */
export const DEFAULT_TIMEZONE = 'America/Caracas';

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

/** Valida que una zona horaria IANA sea reconocida por el runtime. */
export function isValidTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Descompone un instante UTC en sus componentes de pared en `timeZone`. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  // `hour12: false` puede devolver 24 para medianoche en algunos runtimes.
  const hour = get('hour') % 24;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
    second: get('second'),
  };
}

/** Offset de la zona respecto a UTC, en ms, para ese instante concreto. */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Clave de día `YYYY-MM-DD` de un instante, según la zona del calendario.
 * Es la unidad con la que se agrupan las tarjetas del slider.
 */
export function dayKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Hora de pared `HH:mm` de un instante, según la zona del calendario. */
export function timeKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/**
 * Convierte una fecha/hora de pared en `timeZone` al instante UTC equivalente.
 * `day` = 'YYYY-MM-DD', `time` = 'HH:mm'.
 *
 * Se resuelve en dos pasos porque el offset depende del instante (DST): se
 * hace una primera estimación, se lee el offset real de ese momento y se
 * corrige. Dos iteraciones bastan para cualquier zona IANA.
 */
export function zonedToUtc(day: string, time: string, timeZone: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const naive = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);

  let guess = new Date(naive);
  for (let i = 0; i < 2; i++) {
    const off = offsetMs(guess, timeZone);
    const next = new Date(naive - off);
    if (next.getTime() === guess.getTime()) break;
    guess = next;
  }
  return guess;
}

/** Suma `n` días a una clave de día 'YYYY-MM-DD' (aritmética de calendario pura). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`;
}

/** Diferencia en días entre dos claves 'YYYY-MM-DD' (b - a). */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / 86_400_000);
}

/** Día de hoy en la zona del calendario. */
export function todayKey(timeZone: string): string {
  return dayKey(new Date(), timeZone);
}

/** Día de la semana (0 = domingo) de una clave 'YYYY-MM-DD'. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Lunes de la semana que contiene `day`. */
export function startOfWeek(day: string): string {
  const wd = weekdayOf(day);
  return addDays(day, wd === 0 ? -6 : 1 - wd);
}

/** Primer día del mes que contiene `day`. */
export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Cantidad de días del mes que contiene `day`. */
export function daysInMonth(day: string): number {
  const [y, m] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const WEEKDAYS_ES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Etiqueta corta en español: "Lun 29". */
export function shortLabel(day: string): string {
  return `${WEEKDAYS_ES_SHORT[weekdayOf(day)]} ${Number(day.slice(8, 10))}`;
}

/** Etiqueta larga en español: "lunes 29 de agosto". */
export function longLabel(day: string): string {
  const [, m, d] = day.split('-').map(Number);
  return `${WEEKDAYS_ES[weekdayOf(day)]} ${d} de ${MONTHS_ES[m - 1]}`;
}

/** Etiqueta de mes en español: "agosto 2026". */
export function monthLabel(day: string): string {
  const [y, m] = day.split('-').map(Number);
  return `${MONTHS_ES[m - 1]} ${y}`;
}

export { WEEKDAYS_ES_SHORT, MONTHS_ES };
