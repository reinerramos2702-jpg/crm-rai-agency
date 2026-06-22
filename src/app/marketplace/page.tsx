'use client';

import { Store, Package, Plug, Star } from 'lucide-react';
import ModulePlaceholder from '@/components/ModulePlaceholder';

export default function MarketplacePage() {
  return (
    <ModulePlaceholder
      icon={Store}
      title="Aplicaciones del mercado"
      subtitle="Conecta integraciones, extensiones y apps de terceros para potenciar tu CRM."
      count={0}
      countLabel="apps instaladas"
      primaryLabel="Explorar mercado"
      tabs={[
        { id: 'destacados', label: 'Destacados', icon: Star },
        { id: 'todas', label: 'Todas las apps', icon: Package },
        { id: 'instaladas', label: 'Instaladas', icon: Plug },
      ]}
      emptyTitle="Aún no tienes apps instaladas"
      emptyHint="Conecta integraciones de pago, mensajería, analítica y más para extender tu CRM."
    />
  );
}
