const MINUS = '−';

/** «UTC−4», «UTC+5:30» o «UTC» a partir de los minutos al este de UTC. */
export function formatUtcOffset(minutesEast: number): string {
  if (!Number.isFinite(minutesEast) || minutesEast === 0) return 'UTC';
  const sign = minutesEast < 0 ? MINUS : '+';
  const abs = Math.abs(Math.round(minutesEast));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** Minutos al este de UTC del navegador en ese instante. */
export function localOffsetMinutes(date: Date = new Date()): number {
  return -date.getTimezoneOffset();
}

export function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface FormatOptions { timeZone?: string }

/** «17 oct 2026, 14:05» o «—» si no hay fecha. */
export function formatDateTime(value: string | Date | null | undefined, { timeZone }: FormatOptions = {}): string {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone,
  }).format(d);
}

/** «17 oct 2026» o «—». */
export function formatDate(value: string | Date | null | undefined, { timeZone }: FormatOptions = {}): string {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(d);
}

/** «hace 5 min», «hace 3 h», «ayer», «hace 4 d»; más allá de 30 días, la fecha. */
export function relativeTime(value: string | Date | null | undefined, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return '—';
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1) return 'justo ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days <= 30) return `hace ${days} d`;
  return formatDate(d);
}
