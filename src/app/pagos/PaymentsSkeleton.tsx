import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';

export function KpiSkeleton() {
  return (
    <div className="pg-kpis" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="card pg-kpi">
          <SkeletonLine width="45%" height={10} />
          <SkeletonLine width="70%" height={24} />
          <SkeletonLine width="55%" height={10} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card pg-card" role="status" aria-busy="true">
      <span className="fx-sr-only">Cargando pagos…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="pg-skel-row" aria-hidden="true">
          <SkeletonLine width="22%" height={12} />
          <SkeletonLine width="28%" height={12} />
          <SkeletonLine width="14%" height={12} className="pg-skel-hide" />
          <SkeletonLine width="12%" height={12} />
        </div>
      ))}
    </div>
  );
}

/** Esqueleto completo de la página (lo usa `loading.tsx`). */
export function PaymentsPageSkeleton() {
  return (
    <div className="container pg-page" aria-busy="true">
      <div className="pg-head">
        <div className="pg-skel-stack">
          <SkeletonLine width={150} height={24} />
          <SkeletonLine width={260} height={12} />
        </div>
        <SkeletonLine width={150} height={36} />
      </div>
      <KpiSkeleton />
      <div className="pg-skel-bar" aria-hidden="true">
        <SkeletonLine width="100%" height={40} />
      </div>
      <TableSkeleton />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="container pg-page" role="status" aria-busy="true">
      <span className="fx-sr-only">Cargando pago…</span>
      <div className="pg-skel-stack" aria-hidden="true">
        <SkeletonLine width={220} height={14} />
        <div className="card pg-detail-hero">
          <SkeletonLine width="35%" height={22} />
          <SkeletonLine width="25%" height={36} />
          <SkeletonLine width="45%" height={12} />
        </div>
        <div className="pg-detail-grid">
          <div className="card"><SkeletonLine height={120} /></div>
          <div className="card"><SkeletonLine height={120} /></div>
        </div>
      </div>
    </div>
  );
}
