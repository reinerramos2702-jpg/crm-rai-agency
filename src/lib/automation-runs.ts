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

/* ------------------------------------------------------------------ */
/* Consulta al servidor, resumen, texto legible y exportación CSV      */
/* ------------------------------------------------------------------ */

/** Inicio del periodo en ISO (hora del dispositivo para «hoy») o `null` si es todo el historial. */
export function rangeSinceIso(range: RunRange, now = new Date()): string | null {
  const start = rangeStart(range, now);
  return start === null ? null : new Date(start).toISOString();
}

/** URL de la API con los filtros aplicados en el servidor; así el historial completo se filtra, no solo lo cargado. */
export function buildRunsUrl(filters: RunFilters, opts: { limit: number; cursor?: string | null; now?: Date }): string {
  const params = new URLSearchParams({ limit: String(opts.limit) });
  if (filters.status !== 'todos') params.set('status', filters.status);
  if (filters.workflowId) params.set('workflowId', filters.workflowId);
  const since = rangeSinceIso(filters.range, opts.now);
  if (since) params.set('since', since);
  if (opts.cursor) params.set('cursor', opts.cursor);
  return `/api/automations/runs?${params.toString()}`;
}

export interface RunsSummary {
  total: number;
  success: number;
  error: number;
  skipped: number;
  pending: number;
  /** Porcentaje 0–100 de éxito sobre las ejecuciones que terminaron (excluye omitidas y pendientes); `null` si no hay. */
  successRate: number | null;
}

export function summarizeCounts(counts: Partial<Record<string, number>>): RunsSummary {
  const success = counts.success ?? 0;
  const error = counts.error ?? 0;
  const skipped = counts.skipped ?? 0;
  const pending = counts.pending ?? 0;
  const done = success + error;
  return {
    total: success + error + skipped + pending,
    success,
    error,
    skipped,
    pending,
    successRate: done > 0 ? Math.round((success / done) * 100) : null,
  };
}

/** Quita direcciones web (los webhooks pueden llevar claves en la URL) de cualquier texto que se muestre o exporte. */
export function redactUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s)"']+/gi, '[URL oculta]');
}

const CHANNELS: Record<string, string> = { whatsapp: 'WhatsApp', email: 'correo', slack: 'Slack', telegram: 'Telegram' };

/** Convierte el texto técnico del motor en una frase que entienda quien gestiona el negocio. */
export function humanizeDetail(raw: string): string {
  const text = redactUrls(raw).trim();
  if (/^send_webhook: sin URL/i.test(text)) return 'Notificación omitida: no hay webhook de n8n configurado en Configuración general.';
  const sent = /^send_webhook: POST .*\((\w+)\) → (\d{3})/i.exec(raw);
  if (sent) {
    const channel = CHANNELS[sent[1]] ?? sent[1];
    const code = Number(sent[2]);
    return code >= 200 && code < 300
      ? `Notificación entregada a n8n (canal ${channel}).`
      : `n8n respondió con error ${code} al enviar por ${channel}. Revisa el flujo en n8n.`;
  }
  const net = /^send_webhook: error de red — (.*)$/i.exec(text);
  if (net) return `No se pudo contactar el webhook de n8n (${net[1] || 'sin detalle'}).`;
  if (/sin contacto/i.test(text)) return 'Este paso necesita un contacto y la ejecución no tenía ninguno.';
  if (/sin cita/i.test(text)) return 'Este paso necesita una cita y la ejecución no tenía ninguna.';
  if (/sin contenido configurado/i.test(text)) return 'La nota está vacía: escribe su texto en el editor del flujo.';
  if (/^Acción desconocida/i.test(text)) return 'El paso usa una acción que ya no existe. Edítalo o elimínalo.';
  return text;
}

/** Mensaje de error de la ejecución en lenguaje claro (sin URLs). */
export function friendlyRunError(error: string | null | undefined): string | null {
  if (!error || !error.trim()) return null;
  return humanizeDetail(error);
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  // Evita que Excel interprete celdas como fórmulas.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export interface CsvRun extends RunLike {
  contactName?: string | null;
  trigger?: { type: string | null } | null;
  result?: { log: { step: string; ok: boolean; detail: string }[] } | null;
  error?: string | null;
  workflow?: { name: string } | null;
}

export const RUN_CSV_HEADERS = ['Fecha', 'Flujo', 'Estado', 'Disparador', 'Contacto', 'Pasos', 'Pasos con error', 'Error'];

/** CSV listo para Excel (BOM + separador coma). Sin URLs ni valores que Excel ejecute como fórmula. */
export function buildRunsCsv(runs: CsvRun[], statusLabels: Record<string, string>): string {
  const rows = runs.map((r) => {
    const log = r.result?.log ?? [];
    return [
      r.createdAt,
      r.workflow?.name ?? '',
      statusLabels[r.status] ?? r.status,
      r.trigger?.type ?? '',
      r.contactName ?? '',
      log.length,
      log.filter((l) => !l.ok).length,
      friendlyRunError(r.error) ?? '',
    ].map(csvCell).join(',');
  });
  return `\uFEFF${[RUN_CSV_HEADERS.join(','), ...rows].join('\r\n')}\r\n`;
}

export function runsCsvFileName(now = new Date()): string {
  return `actividad-automatizacion-${now.toISOString().slice(0, 10)}.csv`;
}
