import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';

function CardSkeleton() {
  return (
    <div className="card st-card st-card--skel" aria-hidden="true">
      <div className="st-card-top">
        <span className="fx-shimmer st-skel-icon" />
        <div className="st-card-id" style={{ display: 'grid', gap: 8 }}>
          <SkeletonLine width="70%" height={16} />
          <SkeletonLine width="35%" height={11} />
        </div>
        <SkeletonLine width={72} height={22} />
      </div>
      <SkeletonLine width="80%" height={12} />
      <div className="st-metrics">
        {[0, 1, 2].map((i) => (
          <div key={i} className="st-metric" style={{ display: 'grid', gap: 8 }}>
            <SkeletonLine width="70%" height={10} />
            <SkeletonLine width="40%" height={18} />
          </div>
        ))}
      </div>
      <SkeletonLine width="55%" height={12} />
    </div>
  );
}

/** Resumen + barra de filtros + rejilla de tarjetas, con las medidas finales (sin saltos de diseño). */
export function SitesBodySkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="st-body" aria-busy="true">
      <span className="fx-sr-only" role="status">Cargando sitios…</span>
      <div className="st-cq" aria-hidden="true"><div className="st-summary">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card st-tile">
            <span className="fx-shimmer st-skel-tile-icon" />
            <div className="st-tile-body" style={{ display: 'grid', gap: 8 }}>
              <SkeletonLine width="50%" height={10} />
              <SkeletonLine width="30%" height={22} />
              <SkeletonLine width="65%" height={10} />
            </div>
          </div>
        ))}
      </div></div>
      <div className="st-toolbar" aria-hidden="true">
        <SkeletonLine height={40} />
        <div className="st-chip-groups">
          {[84, 72, 104, 96].map((w, i) => <SkeletonLine key={i} width={w} height={34} />)}
        </div>
      </div>
      <div className="st-grid">
        {Array.from({ length: cards }, (_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}

/** Esqueleto de la ruta /sitios para `loading.tsx`: título real y estructura final. */
export function SitesPageSkeleton() {
  return (
    <div className="container st-page">
      <div className="st-head">
        <div>
          <div className="st-title"><h1 className="h1">Sitios / Sucursales</h1></div>
          <p className="muted st-lead">Gestiona las locaciones físicas del negocio con su inventario y métricas operativas.</p>
        </div>
        <div className="st-head-actions" aria-hidden="true">
          <SkeletonLine width={132} height={40} />
        </div>
      </div>
      <SitesBodySkeleton />
    </div>
  );
}
