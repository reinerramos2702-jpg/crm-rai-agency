/** Lógica pura de la lista de Flujos: búsqueda, filtro por estado/carpeta y resumen de la última ejecución. */

import { TRIGGER_META } from './automations/ui-meta';
import { normalizeText } from './automation-templates';

export type FlowStatusFilter = 'todos' | 'active' | 'paused' | 'draft';

export const FLOW_STATUS_FILTERS: { id: FlowStatusFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'paused', label: 'Pausados' },
  { id: 'draft', label: 'Borradores' },
];

export interface FlowListItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  folderId: string | null;
  trigger: { type: string } | null;
}

export function matchesFlowQuery(flow: FlowListItem, query: string): boolean {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const label = TRIGGER_META[flow.trigger?.type as keyof typeof TRIGGER_META]?.label ?? '';
  const haystack = normalizeText(`${flow.name} ${flow.description ?? ''} ${label}`);
  return terms.every((t) => haystack.includes(t));
}

export function filterFlows<T extends FlowListItem>(flows: T[], opts: { query: string; folderId: string; status: FlowStatusFilter }): T[] {
  return flows.filter((f) => {
    if (opts.folderId !== 'all' && f.folderId !== opts.folderId) return false;
    if (opts.status !== 'todos' && f.status !== opts.status) return false;
    return matchesFlowQuery(f, opts.query);
  });
}

/** Contadores por estado, respetando carpeta y búsqueda (no el propio filtro de estado). */
export function countFlowsByStatus(flows: FlowListItem[], opts: { query: string; folderId: string }): Record<FlowStatusFilter, number> {
  const counts: Record<FlowStatusFilter, number> = { todos: 0, active: 0, paused: 0, draft: 0 };
  for (const f of flows) {
    if (opts.folderId !== 'all' && f.folderId !== opts.folderId) continue;
    if (!matchesFlowQuery(f, opts.query)) continue;
    counts.todos += 1;
    if (f.status in counts) counts[f.status as FlowStatusFilter] += 1;
  }
  return counts;
}

export interface LastRunBadge {
  label: string;
  tone: 'ok' | 'danger' | 'warn' | 'muted';
}

/** Estado de la última ejecución en palabras cortas para la fila del flujo. */
export function lastRunBadge(status: string | null | undefined): LastRunBadge | null {
  if (status === 'success') return { label: 'Última: correcta', tone: 'ok' };
  if (status === 'error') return { label: 'Última: con error', tone: 'danger' };
  if (status === 'pending') return { label: 'En espera', tone: 'warn' };
  if (status === 'skipped') return { label: 'Última: omitida', tone: 'muted' };
  return null;
}

/** ¿El atajo «N» debe abrir un flujo nuevo? No si se está escribiendo, hay modificadores o un diálogo abierto. */
export function isNewFlowShortcut(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; repeat?: boolean }, target: EventTarget | null, dialogOpen: boolean): boolean {
  if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || e.repeat || dialogOpen) return false;
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return false;
  return !el.isContentEditable;
}
