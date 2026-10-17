// Lógica PURA de Informes (sin React ni red): se prueba con Vitest.

import { deltaInfo, DASH_PERIODS, type DashboardKpi, type DashPeriod, type DeltaInfo, type KpiId } from '@/lib/dashboard-summary';

export { DASH_PERIODS };
export type { DashPeriod };

export const KPI_META: Record<KpiId, { label: string; hint: string }> = {
  contacts: { label: 'Contactos nuevos', hint: 'Personas añadidas a tu base' },
  conversations: { label: 'Conversaciones nuevas', hint: 'Chats iniciados con clientes' },
  appointments: { label: 'Citas creadas', hint: 'Citas agendadas en el calendario' },
  campaigns: { label: 'Campañas creadas', hint: 'Campañas de contenido iniciadas' },
  payments: { label: 'Pagos cobrados', hint: 'Pagos marcados como pagados' },
  posts: { label: 'Publicaciones publicadas', hint: 'Posts publicados en redes' },
};

export interface KpiCardModel {
  id: KpiId;
  label: string;
  hint: string;
  /** «restricted»: el rol de la persona no tiene acceso a este dato. */
  status: 'value' | 'restricted';
  value: number;
  previous: number;
  delta: DeltaInfo;
  /** Sin actividad ni en este periodo ni en el anterior. */
  empty: boolean;
}

/** Tarjetas de los indicadores pedidos, en el orden pedido. Los que el servidor omite quedan como «restricted». */
export function buildKpiCards(kpis: readonly DashboardKpi[] | undefined, ids: readonly KpiId[]): KpiCardModel[] {
  return ids.map((id) => {
    const meta = KPI_META[id];
    const hit = kpis?.find((k) => k.id === id);
    if (!hit) {
      return { id, ...meta, status: 'restricted', value: 0, previous: 0, delta: { dir: 'none', label: 'Sin datos' }, empty: false };
    }
    return {
      id,
      ...meta,
      status: 'value',
      value: hit.current,
      previous: hit.previous,
      delta: deltaInfo(hit.current, hit.previous),
      empty: hit.current === 0 && hit.previous === 0,
    };
  });
}

/** true si hay al menos una tarjeta con dato y todas están sin actividad. */
export function allEmpty(cards: readonly KpiCardModel[]): boolean {
  const withData = cards.filter((c) => c.status === 'value');
  return withData.length > 0 && withData.every((c) => c.empty);
}

export function formatCount(n: number, locale = 'es'): string {
  return new Intl.NumberFormat(locale).format(Number.isFinite(n) ? n : 0);
}

export function periodText(days: number): string {
  return `últimos ${days} días`;
}

/** Hora local «HH:MM» de una marca ISO; null si no es válida. */
export function timeText(iso: string | undefined, locale = 'es'): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Texto accesible de la variación: «+12 % frente a los 7 días anteriores». */
export function deltaAria(delta: DeltaInfo, days: number): string {
  if (delta.dir === 'none') return 'Sin datos para comparar';
  if (delta.dir === 'new') return `Nuevo: no hubo actividad en los ${days} días anteriores`;
  return `${delta.label} frente a los ${days} días anteriores`;
}
