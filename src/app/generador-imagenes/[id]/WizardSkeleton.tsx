import React from 'react';
import { SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton';

/**
 * Esqueleto del wizard con las mismas columnas y alturas mínimas que la página real,
 * para que al llegar los datos no haya saltos de diseño. Sin estado: sirve de `loading.tsx`.
 */
export function WizardSkeleton() {
  return (
    <div className="gw-page" aria-busy="true">
      <span className="fx-sr-only" role="status">Cargando la grilla…</span>
      <div className="gw-progress card gw-progress-skel">
        <SkeletonLine width={220} height={18} />
        <SkeletonLine height={8} />
        <div className="gw-days">
          {Array.from({ length: 7 }, (_, i) => (
            <SkeletonLine key={i} height={74} />
          ))}
        </div>
      </div>
      <div className="gw-layout">
        <div className="gw-setup">
          <SkeletonCard lines={5} className="gw-skel-setup" />
          <SkeletonCard lines={4} className="gw-skel-setup" />
        </div>
        <SkeletonCard lines={6} className="gw-skel-chat" />
        <SkeletonCard lines={6} className="gw-skel-studio" />
      </div>
    </div>
  );
}
