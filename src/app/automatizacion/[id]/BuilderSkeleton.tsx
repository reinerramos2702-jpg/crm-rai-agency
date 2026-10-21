import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';

/** Esqueleto del editor con la misma estructura que la pantalla final (cabecera, dos tarjetas y panel lateral). */
export function BuilderSkeleton() {
  return (
    <div className="bd-grid" aria-busy="true" aria-label="Cargando el flujo">
      <div className="bd-col">
        <div className="card bd-skel-card"><SkeletonLine width={80} height={12} /><SkeletonLine height={38} width="60%" /></div>
        <div className="card bd-skel-card"><SkeletonLine width={140} height={14} /><SkeletonLine height={38} /><SkeletonLine width="70%" height={12} /></div>
        <div className="card bd-skel-card"><SkeletonLine width={120} height={14} /><SkeletonLine height={38} /><SkeletonLine height={64} /></div>
      </div>
      <div className="card bd-skel-card"><SkeletonLine width={150} height={14} /><SkeletonLine height={40} /><SkeletonLine height={40} /><SkeletonLine height={40} /></div>
    </div>
  );
}
