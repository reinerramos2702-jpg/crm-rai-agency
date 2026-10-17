// Datos tipados de las pestañas de Informes.

import { BarChart3, LineChart, PieChart, TrendingUp, type LucideIcon } from 'lucide-react';
import type { KpiId } from '@/lib/dashboard-summary';

export type ReportTabId = 'overview' | 'ventas' | 'campanas' | 'fuentes';
export type GhostKind = 'line' | 'bars' | 'donut';

export interface ReportTab {
  id: ReportTabId;
  label: string;
  icon: LucideIcon;
  /** Indicadores reales (solo lectura) que muestra la pestaña. */
  kpis: readonly KpiId[];
  description: string;
  ghost: { kind: GhostKind; title: string; text: string };
}

export const REPORT_TABS: readonly ReportTab[] = [
  {
    id: 'overview',
    label: 'Resumen',
    icon: TrendingUp,
    kpis: ['contacts', 'conversations', 'appointments', 'campaigns', 'payments', 'posts'],
    description: 'Actividad del periodo comparada con el periodo anterior.',
    ghost: {
      kind: 'line',
      title: 'Evolución en el tiempo',
      text: 'Aquí verás cómo cambia tu actividad día a día cuando el histórico esté disponible.',
    },
  },
  {
    id: 'ventas',
    label: 'Ventas',
    icon: BarChart3,
    kpis: ['payments'],
    description: 'Pagos cobrados en el periodo. El detalle por producto y monto llegará en próximas iteraciones.',
    ghost: {
      kind: 'bars',
      title: 'Ingresos por periodo',
      text: 'Compararás tus ingresos semana a semana cuando el reporte de ventas esté disponible.',
    },
  },
  {
    id: 'campanas',
    label: 'Campañas',
    icon: LineChart,
    kpis: ['campaigns', 'posts'],
    description: 'Campañas iniciadas y publicaciones realizadas en el periodo.',
    ghost: {
      kind: 'line',
      title: 'Rendimiento de campañas',
      text: 'Verás el alcance y la interacción de cada campaña cuando el reporte esté disponible.',
    },
  },
  {
    id: 'fuentes',
    label: 'Fuentes',
    icon: PieChart,
    kpis: ['contacts', 'conversations'],
    description: 'Nuevos contactos y conversaciones. El origen de cada contacto llegará en próximas iteraciones.',
    ghost: {
      kind: 'donut',
      title: 'Origen de tus contactos',
      text: 'Sabrás de qué canal llegan tus clientes cuando el reporte de fuentes esté disponible.',
    },
  },
];

export function reportTabById(id: string): ReportTab {
  return REPORT_TABS.find((t) => t.id === id) ?? REPORT_TABS[0];
}
