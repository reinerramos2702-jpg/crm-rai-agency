import React from 'react';
import { MarketingHead } from './MarketingHead';
import { KpiSkeletonGrid, PlannerSkeleton, StatusSkeleton, TabsSkeleton } from './skeletons';

/** Esqueleto de /marketing con las medidas reales de cada bloque (sin saltos al cargar). Sin estado: sirve de loading.tsx y de respaldo de Suspense. */
export function MarketingSkeleton() {
  return (
    <div className="container mkt-page" aria-busy="true">
      <span className="fx-sr-only" role="status">Cargando…</span>
      <MarketingHead status={<StatusSkeleton />} />
      <KpiSkeletonGrid />
      <TabsSkeleton />
      <p className="mkt-tab-desc">&nbsp;</p>
      <PlannerSkeleton />
    </div>
  );
}
