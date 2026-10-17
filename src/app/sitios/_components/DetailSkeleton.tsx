import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';

/** Esqueleto del detalle de un sitio con las medidas finales (cabecera, KPIs, ficha y habitaciones). */
export function DetailSkeleton() {
  return (
    <div className="container st-page" aria-busy="true">
      <span className="fx-sr-only" role="status">Cargando sitio…</span>
      <div className="st-crumbs" aria-hidden="true">
        <SkeletonLine width={48} height={14} />
        <SkeletonLine width={140} height={14} />
      </div>
      <div className="card st-hero" aria-hidden="true">
        <div className="st-hero-top">
          <span className="fx-shimmer st-skel-hero-icon" />
          <div className="st-hero-id" style={{ display: 'grid', gap: 10 }}>
            <SkeletonLine width="min(320px, 70%)" height={26} />
            <SkeletonLine width="min(220px, 50%)" height={13} />
          </div>
          <div className="st-head-actions">
            <SkeletonLine width={96} height={40} />
            <SkeletonLine width={108} height={40} />
          </div>
        </div>
        <div className="st-kpis">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card st-tile">
              <span className="fx-shimmer st-skel-tile-icon" />
              <div className="st-tile-body" style={{ display: 'grid', gap: 8 }}>
                <SkeletonLine width="60%" height={10} />
                <SkeletonLine width="35%" height={22} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card st-info" aria-hidden="true" style={{ display: 'grid', gap: 12 }}>
        <SkeletonLine width={120} height={16} />
        {[0, 1, 2, 3].map((i) => <SkeletonLine key={i} width={i % 2 ? '70%' : '90%'} height={14} />)}
      </div>
      <div className="card" aria-hidden="true" style={{ display: 'grid', gap: 14 }}>
        <SkeletonLine width={160} height={16} />
        {[0, 1, 2].map((i) => <SkeletonLine key={i} height={36} />)}
      </div>
    </div>
  );
}
