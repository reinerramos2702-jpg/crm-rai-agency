import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { KpiGridSkeleton } from './KpiGrid';

/** Esqueleto de la ruta: título real, pestañas en una fila y 6 tarjetas. Mismas medidas que la página. */
export function ReportsSkeleton() {
  return (
    <div className="container rp-page" aria-busy="true">
      <span className="fx-sr-only" role="status">
        Cargando…
      </span>
      <div className="rp-head">
        <div className="rp-head-main">
          <span className="rp-head-icon" aria-hidden="true" />
          <div>
            <h1 className="h1">Informes</h1>
            <p className="muted rp-sub">Reportes, métricas y análisis de tu negocio.</p>
          </div>
        </div>
        <SkeletonLine width={140} height={42} />
      </div>
      <div className="rp-tabs-skel">
        {[80, 70, 90, 80].map((w, n) => (
          <SkeletonLine key={n} width={w} height={18} />
        ))}
      </div>
      <SkeletonLine height={44} />
      <KpiGridSkeleton count={6} />
      <div className="card rp-ghost rp-ghost--skel">
        <SkeletonLine width={200} height={18} />
        <SkeletonLine height={140} />
      </div>
    </div>
  );
}
