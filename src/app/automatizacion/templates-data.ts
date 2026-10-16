import { Boxes, CalendarClock, ShoppingBag, type LucideIcon } from 'lucide-react';
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from '@/lib/automations/templates';
import type { NicheFilter, TemplateNiche } from '@/lib/automation-templates';

export type TemplateT = WorkflowTemplate;

/** Las plantillas viven en el paquete (son estáticas): se pintan al instante, sin pedirlas a la red. */
export const TEMPLATES: TemplateT[] = WORKFLOW_TEMPLATES;

export interface NicheMeta {
  label: string;
  chip: string;
  icon: LucideIcon;
  hint: string;
}

export const NICHE_META: Record<TemplateNiche, NicheMeta> = {
  servicios: { label: 'Servicios / Citas', chip: 'Servicios', icon: CalendarClock, hint: 'Citas, recordatorios y seguimiento' },
  retail: { label: 'Retail (detal)', chip: 'Retail', icon: ShoppingBag, hint: 'Leads, compras y recompra' },
  mayoreo: { label: 'Mayoreo', chip: 'Mayoreo', icon: Boxes, hint: 'Pedidos, reposición y cuentas clave' },
};

export const NICHE_FILTERS: { id: NicheFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'servicios', label: NICHE_META.servicios.chip },
  { id: 'retail', label: NICHE_META.retail.chip },
  { id: 'mayoreo', label: NICHE_META.mayoreo.chip },
];
