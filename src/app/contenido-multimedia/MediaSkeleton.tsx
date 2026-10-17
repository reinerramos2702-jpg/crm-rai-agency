import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';

/** Una tarjeta de esqueleto con las mismas medidas que `MediaCard` (miniatura 4:3 + dos líneas). */
function SkeletonTile() {
  return (
    <div className="mm-card is-skeleton" aria-hidden="true">
      <span className="fx-shimmer mm-skel-thumb" />
      <div className="mm-skel-body">
        <SkeletonLine width="80%" height={13} />
        <SkeletonLine width="55%" height={11} />
      </div>
    </div>
  );
}

/** Cuadrícula de esqueleto: sin estado ni efectos, sirve igual en `loading.tsx` y mientras llegan los datos. */
export function MediaGridSkeleton({ tiles = 8 }: { tiles?: number }) {
  return (
    <div className="mm-grid" aria-busy="true">
      <span className="fx-sr-only" role="status">Cargando biblioteca…</span>
      {Array.from({ length: tiles }, (_, i) => (
        <SkeletonTile key={i} />
      ))}
    </div>
  );
}

/** Pestañas y barra de herramientas en reposo, para que el esqueleto de la ruta ocupe lo mismo que la página real. */
export function MediaPageSkeleton() {
  return (
    <div className="container">
      <div className="mm-tabs" aria-hidden="true">
        {[96, 84, 72, 104].map((w, i) => (
          <span key={i} style={{ padding: '14px 14px 12px' }}>
            <SkeletonLine width={w} height={16} />
          </span>
        ))}
      </div>
      <div className="mm-toolbar" aria-hidden="true">
        <SkeletonLine width="min(100%, 320px)" height={40} />
        <SkeletonLine width={170} height={40} />
      </div>
      <MediaGridSkeleton />
    </div>
  );
}
