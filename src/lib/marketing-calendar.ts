/**
 * Calendario del Planificador de Redes: lógica pura (sin red ni DOM).
 * Las fechas se agrupan por día en la zona horaria de la empresa, no la del navegador.
 */

export interface PlannerPost {
  id: string;
  campaignRef: string | null;
  dayNumber: number | null;
  caption: string;
  mediaUrls: string[];
  mediaType: string;
  scheduledAt: string;
  timezone: string;
  status: string;
  attempts: number;
  lastError: string | null;
  permalink: string | null;
  simulated: boolean;
  publishedAt: string | null;
}

export type VisualTone = 'ok' | 'warn' | 'danger' | 'muted' | 'info';

export interface VisualStatus {
  key: 'scheduled' | 'published' | 'simulated' | 'failed' | 'publishing' | 'draft' | 'cancelled';
  label: string;
  tone: VisualTone;
}

/** Estado visible de una publicación: «Simulada» tiene prioridad sobre «Publicada» (no tocó Instagram). */
export function postVisualStatus(p: Pick<PlannerPost, 'status' | 'simulated'>): VisualStatus {
  if (p.status === 'published') {
    return p.simulated
      ? { key: 'simulated', label: 'Simulada', tone: 'info' }
      : { key: 'published', label: 'Publicada', tone: 'ok' };
  }
  switch (p.status) {
    case 'failed':
      return { key: 'failed', label: 'Falló', tone: 'danger' };
    case 'publishing':
      return { key: 'publishing', label: 'Publicando', tone: 'warn' };
    case 'draft':
      return { key: 'draft', label: 'Borrador', tone: 'muted' };
    case 'cancelled':
      return { key: 'cancelled', label: 'Cancelada', tone: 'muted' };
    default:
      return { key: 'scheduled', label: 'Programada', tone: 'warn' };
  }
}

export type StatusFilter = 'all' | VisualStatus['key'];

export const STATUS_FILTERS: ReadonlyArray<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'scheduled', label: 'Programadas' },
  { id: 'published', label: 'Publicadas' },
  { id: 'simulated', label: 'Simuladas' },
  { id: 'failed', label: 'Fallidas' },
];

export function filterPostsByStatus<T extends Pick<PlannerPost, 'status' | 'simulated'>>(posts: T[], filter: StatusFilter): T[] {
  if (filter === 'all') return posts;
  return posts.filter((p) => postVisualStatus(p).key === filter);
}

export function countByVisualStatus(posts: Array<Pick<PlannerPost, 'status' | 'simulated'>>): Record<VisualStatus['key'], number> {
  const out: Record<VisualStatus['key'], number> = {
    scheduled: 0, published: 0, simulated: 0, failed: 0, publishing: 0, draft: 0, cancelled: 0,
  };
  for (const p of posts) out[postVisualStatus(p).key]++;
  return out;
}

// ---------- Fechas (claves 'YYYY-MM-DD') ----------

const pad = (n: number) => String(n).padStart(2, '0');

export function keyFromUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function utcFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDaysKey(key: string, days: number): string {
  const d = utcFromKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return keyFromUtc(d);
}

function safeZone(tz: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/** Día calendario ('YYYY-MM-DD') de un instante en la zona dada. */
export function dayKeyInZone(input: Date | string | number, tz: string): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: safeZone(tz), year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Hora local «HH:mm» de un instante en la zona dada. */
export function timeLabel(input: Date | string | number, tz: string): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es', { timeZone: safeZone(tz), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}

export interface MonthRef {
  year: number;
  /** 0–11 */
  month: number;
}

export function monthOfKey(key: string): MonthRef {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m - 1 };
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const idx = ref.year * 12 + ref.month + delta;
  return { year: Math.floor(idx / 12), month: ((idx % 12) + 12) % 12 };
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

export function monthLabel(ref: MonthRef): string {
  const name = MONTHS[ref.month] ?? '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${ref.year}`;
}

export interface GridCell {
  key: string;
  day: number;
  inMonth: boolean;
}

/** Semanas (lunes a domingo) que cubren el mes. */
export function monthGrid(ref: MonthRef): GridCell[][] {
  const first = new Date(Date.UTC(ref.year, ref.month, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const start = new Date(Date.UTC(ref.year, ref.month, 1 - offset));
  const daysInMonth = new Date(Date.UTC(ref.year, ref.month + 1, 0)).getUTCDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const out: GridCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: GridCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + w * 7 + i);
      row.push({ key: keyFromUtc(d), day: d.getUTCDate(), inMonth: d.getUTCMonth() === ref.month });
    }
    out.push(row);
  }
  return out;
}

/** Lunes de la semana que contiene la clave. */
export function weekStartKey(key: string): string {
  const d = utcFromKey(key);
  return addDaysKey(key, -((d.getUTCDay() + 6) % 7));
}

export function weekKeys(anchorKey: string): string[] {
  const start = weekStartKey(anchorKey);
  return Array.from({ length: 7 }, (_, i) => addDaysKey(start, i));
}

/** Rango ISO a pedir al API para cubrir una lista de claves (con holgura por zona horaria). */
export function rangeForKeys(keys: string[]): { from: string; to: string } {
  const first = keys[0];
  const last = keys[keys.length - 1];
  return {
    from: `${addDaysKey(first, -1)}T00:00:00.000Z`,
    to: `${addDaysKey(last, 2)}T00:00:00.000Z`,
  };
}

export function groupPostsByDay<T extends Pick<PlannerPost, 'scheduledAt'>>(posts: T[], tz: string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const p of posts) {
    const k = dayKeyInZone(p.scheduledAt, tz);
    if (!k) continue;
    (out[k] ??= []).push(p);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return out;
}

/** Días de hoy en adelante, dentro de las claves visibles, sin ninguna publicación activa (no cancelada). */
export function findGapKeys(
  keys: string[],
  grouped: Record<string, Array<Pick<PlannerPost, 'status' | 'simulated'>>>,
  todayKey: string,
): Set<string> {
  const gaps = new Set<string>();
  for (const k of keys) {
    if (k < todayKey) continue;
    const active = (grouped[k] ?? []).filter((p) => p.status !== 'cancelled');
    if (active.length === 0) gaps.add(k);
  }
  return gaps;
}

export function longDayLabel(key: string): string {
  const d = utcFromKey(key);
  return new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

/** Enlace al compositor del generador para planear contenido (con la fecha sugerida como referencia). */
export const PLAN_CONTENT_HREF = '/generador-imagenes';
