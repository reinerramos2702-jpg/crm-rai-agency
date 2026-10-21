import { Boxes, CalendarClock, MessageCircle, Package, RefreshCw, ShoppingBag, Star, TrendingUp, type LucideIcon } from 'lucide-react';
import type { WorkflowTemplate } from '@/lib/automations/templates';
import type { NicheFilter, TemplateNiche } from '@/lib/automation-templates';
import { CATEGORY_LABELS, GALLERY_TEMPLATES, type CategoryFilter, type TemplateCategory } from '@/lib/automation-template-gallery';

export type TemplateT = WorkflowTemplate;

/** Las plantillas viven en el paquete (son estáticas): se pintan al instante, sin pedirlas a la red. */
export const TEMPLATES: TemplateT[] = GALLERY_TEMPLATES;

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
  { id: 'todas', label: 'Todos los negocios' },
  { id: 'servicios', label: NICHE_META.servicios.label },
  { id: 'retail', label: NICHE_META.retail.label },
  { id: 'mayoreo', label: NICHE_META.mayoreo.label },
];

export const CATEGORY_ICONS: Record<TemplateCategory, LucideIcon> = {
  ventas: TrendingUp,
  citas: CalendarClock,
  seguimiento: RefreshCw,
  reputacion: Star,
  atencion: MessageCircle,
  pedidos: Package,
};

export const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  ...(Object.keys(CATEGORY_LABELS) as TemplateCategory[]).map((id) => ({ id, label: CATEGORY_LABELS[id] })),
];
