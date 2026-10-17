/** Galería de plantillas: categorías por objetivo, plantillas extra, requisitos (integraciones) y filtros. Lógica pura. */

import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from './automations/templates';
import type { WorkflowStep } from './automations/types';
import { TRIGGER_META } from './automations/ui-meta';
import { channelLabel } from './automation-safety';
import { matchesQuery, normalizeText, templateTags, type NicheFilter, type TemplateLike } from './automation-templates';

export type TemplateCategory = 'ventas' | 'citas' | 'seguimiento' | 'reputacion' | 'atencion' | 'pedidos';
export type CategoryFilter = 'todas' | TemplateCategory;

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  ventas: 'Ventas',
  citas: 'Citas',
  seguimiento: 'Seguimiento',
  reputacion: 'Reputación',
  atencion: 'Atención',
  pedidos: 'Pedidos',
};

export const CATEGORY_HINTS: Record<TemplateCategory, string> = {
  ventas: 'Captar, convertir y fidelizar',
  citas: 'Recordatorios, reservas y no-shows',
  seguimiento: 'Reactivar y no dejar enfriar',
  reputacion: 'Opiniones y reseñas',
  atencion: 'Tiempos de respuesta del equipo',
  pedidos: 'Estados, reposición y cuentas clave',
};

const CATEGORY_BY_ID: Record<string, TemplateCategory> = {
  servicios_recordatorio_24h: 'citas',
  servicios_confirmacion_reserva: 'citas',
  servicios_no_show: 'citas',
  servicios_seguimiento_post_cita: 'reputacion',
  servicios_reactivacion_inactivo: 'seguimiento',
  retail_bienvenida_lead: 'ventas',
  retail_sla_vencido: 'atencion',
  retail_reenganche_frio: 'seguimiento',
  retail_agradecimiento_cross_sell: 'ventas',
  retail_vip_recompra: 'ventas',
  mayoreo_recordatorio_reposicion: 'pedidos',
  mayoreo_pedido_grande: 'pedidos',
  mayoreo_cliente_riesgo: 'seguimiento',
  mayoreo_actualizacion_pedido: 'pedidos',
  mayoreo_onboarding_cliente: 'ventas',
  servicios_solicitud_resena: 'reputacion',
  servicios_cita_cancelada: 'citas',
  retail_lead_interesado: 'ventas',
  mayoreo_primer_pedido: 'pedidos',
};

const step = (type: WorkflowStep['type'], config: Record<string, unknown>, idx: number): WorkflowStep => ({ id: `step_${idx}`, type, config });

/** Plantillas adicionales: usan solo disparadores, condiciones y acciones que el motor ya ejecuta. */
export const EXTRA_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'servicios_solicitud_resena',
    niche: 'servicios',
    name: 'Solicitud de reseña tras la cita',
    description: 'Unas horas después de completarse una cita pide una reseña pública, una sola vez por cliente.',
    trigger: { type: 'appointment.completed', config: { hoursAfter: 3 } },
    steps: [
      step('condition', { check: 'tag_not_includes', tag: 'resena_solicitada' }, 0),
      step('action', { action: 'send_webhook', event: 'review.request', message: 'Hola {{contact.name}}, gracias por visitarnos. ¿Nos regalas una reseña? Nos ayuda muchísimo.' }, 1),
      step('action', { action: 'add_tag', tag: 'resena_solicitada' }, 2),
    ],
  },
  {
    id: 'servicios_cita_cancelada',
    niche: 'servicios',
    name: 'Cita cancelada: ofrecer reagendar',
    description: 'Cuando una cita pasa a «Cancelada», invita al cliente a elegir otra fecha y deja una tarea al equipo.',
    trigger: { type: 'appointment.status_changed', config: { to: 'cancelled' } },
    steps: [
      step('action', { action: 'send_webhook', event: 'appointment.cancelled', message: 'Hola {{contact.name}}, tu cita "{{appointment.title}}" fue cancelada. ¿Quieres reagendarla?' }, 0),
      step('action', { action: 'create_task', title: 'Reagendar cita cancelada de {{contact.name}}', dueInHours: 24 }, 1),
      step('action', { action: 'add_tag', tag: 'cita_cancelada' }, 2),
    ],
  },
  {
    id: 'retail_lead_interesado',
    niche: 'retail',
    name: 'Lead interesado: aviso y tarea comercial',
    description: 'Al marcar un contacto como «interesado», avisa al equipo por Slack y crea una tarea para enviarle la propuesta.',
    trigger: { type: 'contact.tag_added', config: { tag: 'interesado' } },
    steps: [
      step('action', { action: 'send_webhook', event: 'lead.hot', channel: 'slack', message: 'Lead interesado: {{contact.name}} ({{contact.phone}}).' }, 0),
      step('action', { action: 'create_task', title: 'Enviar propuesta a {{contact.name}}', dueInHours: 4 }, 1),
    ],
  },
  {
    id: 'mayoreo_primer_pedido',
    niche: 'mayoreo',
    name: 'Mayorista sin primer pedido',
    description: 'A los 7 días sin actividad de un mayorista que aún no pidió, le recuerda el catálogo y crea una llamada de seguimiento.',
    trigger: { type: 'contact.inactive', config: { days: 7 } },
    steps: [
      step('condition', { check: 'tag_includes', tag: 'cliente_mayorista' }, 0),
      step('condition', { check: 'tag_not_includes', tag: 'pedido_registrado' }, 1),
      step('condition', { check: 'tag_not_includes', tag: 'primer_pedido_recordado' }, 2),
      step('action', { action: 'send_webhook', event: 'wholesale.first_order', message: 'Hola {{contact.name}}, ¿te ayudamos a armar tu primer pedido? Estamos atentos.' }, 3),
      step('action', { action: 'add_tag', tag: 'primer_pedido_recordado' }, 4),
      step('action', { action: 'create_task', title: 'Llamar a {{contact.name}}: primer pedido pendiente', dueInHours: 24 }, 5),
    ],
  },
];

export const GALLERY_TEMPLATES: WorkflowTemplate[] = [...WORKFLOW_TEMPLATES, ...EXTRA_TEMPLATES];

export function categoryOf(template: Pick<TemplateLike, 'id'>): TemplateCategory {
  return CATEGORY_BY_ID[template.id] ?? 'seguimiento';
}

/* ---------------------------- requisitos ---------------------------- */

export type RequirementState = 'ready' | 'missing' | 'manual';

export interface Requirement {
  id: string;
  label: string;
  state: RequirementState;
  hint: string;
}

export interface RequirementContext {
  /** `null` mientras se cargan los ajustes. */
  webhookConfigured: boolean | null;
}

/**
 * Qué necesita la plantilla para funcionar de verdad. «ready» = comprobado; «missing» = falta;
 * «manual» = no se puede comprobar desde aquí (hay que revisarlo).
 */
export function templateRequirements(template: TemplateLike, ctx: RequirementContext): Requirement[] {
  const out: Requirement[] = [];
  const sends = template.steps.filter((s) => s.type === 'action' && s.config.action === 'send_webhook');
  if (sends.length > 0) {
    const channels = Array.from(new Set(sends.map((s) => String(s.config.channel || 'whatsapp')))).map(channelLabel);
    if (ctx.webhookConfigured === null) {
      out.push({ id: 'n8n', label: 'Webhook de n8n', state: 'manual', hint: 'Comprobando la configuración…' });
    } else {
      out.push({
        id: 'n8n',
        label: 'Webhook de n8n',
        state: ctx.webhookConfigured ? 'ready' : 'missing',
        hint: ctx.webhookConfigured
          ? `Listo. Envía por ${channels.join(' y ')} desde n8n.`
          : 'Sin la URL de n8n (Configuración general) los mensajes se omiten.',
      });
    }
    out.push({ id: 'channel', label: `Canal ${channels.join(' / ')} en n8n`, state: 'manual', hint: 'Debe existir la rama de ese canal en tu flujo de n8n; no se puede comprobar desde aquí.' });
  }
  if (TRIGGER_META[template.trigger.type]?.category === 'tiempo') {
    out.push({ id: 'cron', label: 'Corrida programada', state: 'manual', hint: 'Se evalúa cuando corre la tarea programada del motor (/api/automations/run-due).' });
  }
  if (template.trigger.type === 'contact.milestone' && !template.trigger.config.sourceWorkflowId) {
    out.push({ id: 'source', label: 'Flujo fuente', state: 'manual', hint: 'Tras crearlo, abre el editor y pega el ID del flujo cuyas ejecuciones se cuentan.' });
  }
  return out;
}

/** Resumen de una línea para la tarjeta: «Lista», «Falta n8n» o «Revisar 2». */
export function readinessOf(reqs: Requirement[]): { tone: 'ok' | 'warn' | 'muted'; label: string } {
  if (reqs.some((r) => r.state === 'missing')) return { tone: 'warn', label: 'Falta configurar n8n' };
  const manual = reqs.filter((r) => r.state === 'manual').length;
  if (reqs.length === 0) return { tone: 'ok', label: 'Lista para usar' };
  if (manual > 0 && reqs.every((r) => r.state !== 'ready')) return { tone: 'muted', label: 'Requiere revisión' };
  return { tone: 'ok', label: 'Lista para usar' };
}

/* ----------------------------- filtros ------------------------------ */

export interface GalleryFilters {
  query: string;
  category: CategoryFilter;
  niche: NicheFilter;
}

export const DEFAULT_GALLERY_FILTERS: GalleryFilters = { query: '', category: 'todas', niche: 'todas' };

function matchesGalleryQuery(t: TemplateLike, query: string): boolean {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const extra = normalizeText(`${CATEGORY_LABELS[categoryOf(t)]} ${templateTags(t).join(' ')}`);
  return terms.every((term) => matchesQuery(t, term) || extra.includes(term));
}

export function filterGallery<T extends TemplateLike>(templates: T[], f: GalleryFilters): T[] {
  return templates.filter(
    (t) =>
      (f.category === 'todas' || categoryOf(t) === f.category) &&
      (f.niche === 'todas' || t.niche === f.niche) &&
      matchesGalleryQuery(t, f.query)
  );
}

/** Contadores por categoría respetando búsqueda y negocio (no la propia categoría). */
export function countByCategory(templates: TemplateLike[], f: Pick<GalleryFilters, 'query' | 'niche'>): Record<CategoryFilter, number> {
  const counts: Record<CategoryFilter, number> = { todas: 0, ventas: 0, citas: 0, seguimiento: 0, reputacion: 0, atencion: 0, pedidos: 0 };
  for (const t of templates) {
    if (f.niche !== 'todas' && t.niche !== f.niche) continue;
    if (!matchesGalleryQuery(t, f.query)) continue;
    counts.todas += 1;
    counts[categoryOf(t)] += 1;
  }
  return counts;
}
