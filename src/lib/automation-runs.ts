/** Lógica pura de la pestaña Actividad: filtros, agrupación por día y horas relativas. */

export type RunStatusFilter = 'todos' | 'success' | 'error' | 'skipped' | 'pending';
export type RunRange = 'todo' | 'hoy' | '7d' | '30d';

export interface RunLike {
  id: string;
  workflowId: string;
  status: string;
  createdAt: string;
}

export interface RunFilters {
  status: RunStatusFilter;
  workflowId: string;
  range: RunRange;
}

export const DEFAULT_RUN_FILTERS: RunFilters = { status: 'todos', workflowId: '', range: 'todo' };

const DAY_MS = 86_400_000;

export function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function rangeStart(range: RunRange, now: Date): number | null {
  if (range === 'hoy') return startOfDay(now);
  if (range === '7d') return now.getTime() - 7 * DAY_MS;
  if (range === '30d') return now.getTime() - 30 * DAY_MS;
  return null;
}

export function hasActiveFilters(filters: RunFilters): boolean {
  return filters.status !== 'todos' || filters.workflowId !== '' || filters.range !== 'todo';
}

export function filterRuns<T extends RunLike>(runs: T[], filters: RunFilters, now = new Date()): T[] {
  const since = rangeStart(filters.range, now);
  return runs.filter((run) => {
    if (filters.status !== 'todos' && run.status !== filters.status) return false;
    if (filters.workflowId && run.workflowId !== filters.workflowId) return false;
    if (since !== null && new Date(run.createdAt).getTime() < since) return false;
    return true;
  });
}

export function countByStatus(runs: RunLike[]): Record<RunStatusFilter, number> {
  const counts: Record<RunStatusFilter, number> = { todos: runs.length, success: 0, error: 0, skipped: 0, pending: 0 };
  for (const run of runs) {
    if (run.status in counts) counts[run.status as RunStatusFilter] += 1;
  }
  return counts;
}

/** Une páginas sin duplicar ejecuciones (la primera página puede revalidarse mientras hay más cargadas). */
export function mergeRuns<T extends RunLike>(first: T[], more: T[]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const run of [...first, ...more]) {
    if (seen.has(run.id)) continue;
    seen.add(run.id);
    merged.push(run);
  }
  return merged;
}

export function relativeTime(iso: string | null, now = new Date()): string {
  if (!iso) return '—';
  const diff = now.getTime() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '—';
  const seconds = Math.round(diff / 1000);
  if (seconds < 45) return 'hace un momento';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'hace 1 día' : `hace ${days} días`;
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export function formatDateTime(iso: string | null, timeZone?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  });
}

export interface DayGroup<T> {
  key: string;
  label: string;
  runs: T[];
}

export function dayLabel(date: Date, now: Date): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Agrupa (conservando el orden recibido) por día natural del dispositivo. */
export function groupByDay<T extends RunLike>(runs: T[], now = new Date()): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const run of runs) {
    const date = new Date(run.createdAt);
    const key = String(startOfDay(date));
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.runs.push(run);
    } else {
      groups.push({ key, label: dayLabel(date, now), runs: [run] });
    }
  }
  return groups;
}
