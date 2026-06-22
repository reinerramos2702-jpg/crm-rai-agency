'use client';

import { BarChart3, LineChart, PieChart, TrendingUp } from 'lucide-react';
import ModulePlaceholder from '@/components/ModulePlaceholder';

export default function InformesPage() {
  return (
    <ModulePlaceholder
      icon={BarChart3}
      title="Informes"
      subtitle="Reportes, métricas y análisis de tu negocio."
      count={0}
      countLabel="reportes"
      primaryLabel="Crear reporte"
      tabs={[
        { id: 'overview', label: 'Resumen', icon: TrendingUp },
        { id: 'ventas', label: 'Ventas', icon: BarChart3 },
        { id: 'campanas', label: 'Campañas', icon: LineChart },
        { id: 'fuentes', label: 'Fuentes', icon: PieChart },
      ]}
      emptyTitle="Aún no hay datos para mostrar"
      emptyHint="Cuando empieces a operar (ventas, campañas, conversaciones), aquí verás métricas en tiempo real."
    />
  );
}
