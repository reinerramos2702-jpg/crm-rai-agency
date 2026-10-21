/** Lógica pura del panel de Plantillas: búsqueda sin tildes, filtros, orden y vista previa de pasos. */

import { ACTION_META, CONDITION_META, NICHE_LABELS, TRIGGER_META } from './automations/ui-meta';
import type { ActionType, ConditionCheck, TriggerType } from './automations/types';

export type TemplateNiche = 'servicios' | 'retail' | 'mayoreo';
export type NicheFilter = 'todas' | TemplateNiche;
export type TemplateSort = 'recomendado' | 'nombre' | 'pasos-asc' | 'pasos-desc';

export const TEMPLATE_SORT_LABELS: Record<TemplateSort, string> = {
  recomendado: 'Recomendado',
  nombre: 'Nombre (A–Z)',
  'pasos-asc': 'Menos pasos primero',
  'pasos-desc': 'Más pasos primero',
};

export interface TemplateLike {
  id: string;
  niche: TemplateNiche;
  name: string;
  description: string;
  trigger: { type: TriggerType; config: Record<string, unknown> };
  steps: { type: 'condition' | 'delay' | 'action'; config: Record<string, unknown> }[];
}

/** Minúsculas y sin tildes, para comparar «reactivación» con «reactivacion». */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function actionLabels(template: TemplateLike): string[] {
  const labels: string[] = [];
  for (const step of template.steps) {
    if (step.type !== 'action') continue;
    const label = ACTION_META[step.config.action as ActionType]?.label;
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

function searchIndex(template: TemplateLike): string {
  return normalizeText(
    [
      template.name,
      template.description,
      NICHE_LABELS[template.niche],
      TRIGGER_META[template.trigger.type]?.label ?? '',
      ...actionLabels(template),
    ].join(' ')
  );
}

export function matchesQuery(template: TemplateLike, query: string): boolean {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = searchIndex(template);
  return terms.every((term) => haystack.includes(term));
}

export function filterTemplates<T extends TemplateLike>(templates: T[], query: string, niche: NicheFilter): T[] {
  return templates.filter((t) => (niche === 'todas' || t.niche === niche) && matchesQuery(t, query));
}

export function sortTemplates<T extends TemplateLike>(templates: T[], sort: TemplateSort): T[] {
  if (sort === 'recomendado') return templates;
  const copy = [...templates];
  if (sort === 'nombre') return copy.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const dir = sort === 'pasos-asc' ? 1 : -1;
  return copy.sort((a, b) => (a.steps.length - b.steps.length) * dir || a.name.localeCompare(b.name, 'es'));
}

/** Contadores por categoría respetando la búsqueda actual. */
export function countByNiche(templates: TemplateLike[], query: string): Record<NicheFilter, number> {
  const counts: Record<NicheFilter, number> = { todas: 0, servicios: 0, retail: 0, mayoreo: 0 };
  for (const t of templates) {
    if (!matchesQuery(t, query)) continue;
    counts.todas += 1;
    counts[t.niche] += 1;
  }
  return counts;
}

export function triggerKind(template: TemplateLike): 'evento' | 'tiempo' {
  return TRIGGER_META[template.trigger.type]?.category ?? 'evento';
}

export function triggerKindLabel(template: TemplateLike): string {
  return triggerKind(template) === 'evento' ? 'Por evento' : 'Programada';
}

export function templateTags(template: TemplateLike): string[] {
  return actionLabels(template).map((label) => label.replace(/ \(.*\)$/, ''));
}

export type PreviewKind = 'trigger' | 'condition' | 'delay' | 'action';

export interface PreviewStep {
  kind: PreviewKind;
  title: string;
  detail: string | null;
}

const DELAY_UNITS: Record<string, [string, string]> = {
  minutes: ['minuto', 'minutos'],
  hours: ['hora', 'horas'],
  days: ['día', 'días'],
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function triggerDetail(template: TemplateLike): string | null {
  const { type, config } = template.trigger;
  const tags = Array.isArray(config.tags) ? config.tags.filter((t): t is string => typeof t === 'string') : [];
  const tag = text(config.tag) ?? (tags.length ? tags.join(', ') : null);
  if (type === 'contact.tag_added' && tag) return `Etiqueta: ${tag}`;
  if (type === 'appointment.upcoming') return `${Number(config.hoursBefore) || 24} h antes de la cita`;
  if (type === 'appointment.completed') return `${Number(config.hoursAfter) || 2} h después de completarse`;
  if (type === 'appointment.overdue') return `${Number(config.graceMins) || 30} min de tolerancia`;
  if (type === 'contact.inactive' || type === 'conversation.no_response') return `${Number(config.days) || 0} días sin actividad`;
  if (type === 'conversation.sla_overdue') return `${Number(config.overdueMins) || 60} min sin respuesta`;
  if (type === 'contact.milestone') return `${Number(config.minRuns) || 3} ejecuciones exitosas del flujo fuente`;
  return null;
}

function stepDetail(config: Record<string, unknown>): string | null {
  return text(config.message) ?? text(config.title) ?? text(config.body) ?? text(config.tag) ?? text(config.status);
}

/** Línea de tiempo del flujo: disparador → condiciones → esperas → acciones, en el orden de ejecución. */
export function buildFlowPreview(template: TemplateLike): PreviewStep[] {
  const steps: PreviewStep[] = [
    {
      kind: 'trigger',
      title: TRIGGER_META[template.trigger.type]?.label ?? template.trigger.type,
      detail: triggerDetail(template),
    },
  ];
  for (const step of template.steps) {
    if (step.type === 'condition') {
      const check = CONDITION_META[step.config.check as ConditionCheck];
      steps.push({ kind: 'condition', title: check?.label ?? 'Condición', detail: stepDetail(step.config) });
    } else if (step.type === 'delay') {
      const amount = Number(step.config.amount) || 0;
      const [one, many] = DELAY_UNITS[String(step.config.unit)] ?? ['unidad', 'unidades'];
      steps.push({ kind: 'delay', title: `Esperar ${amount} ${amount === 1 ? one : many}`, detail: null });
    } else {
      const action = ACTION_META[step.config.action as ActionType];
      steps.push({ kind: 'action', title: action?.label ?? 'Acción', detail: stepDetail(step.config) });
    }
  }
  return steps;
}
