import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';

/** Una tarjeta de esqueleto con las mismas filas que `MediaCard` (miniatura 4:3 + título, detalle, origen y etiquetas). */
function SkeletonTile() {
  return (
    <div className="mm-card is-skeleton" aria-hidden="true">
      <span className="fx-shimmer mm-skel-thumb" />
      <div className="mm-body">
        <div className="mm-title"><SkeletonLine width="78%" height={13} /></div>
        <div className="mm-detail"><SkeletonLine width="52%" height={11} /></div>
        <div className="mm-meta"><SkeletonLine width="64%" height={16} /></div>
        <div className="mm-tags" />
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

const TAB_WIDTHS = [74, 54, 52, 84] as const;

/** Pestañas y barra de herramientas en reposo, con las mismas clases que la página real (CLS casi nulo). */
export function MediaPageSkeleton() {
  return (
    <div className="container">
      <div className="mm-tabs" aria-hidden="true">
        {TAB_WIDTHS.map((w, i) => (
          <span key={i} className="mm-tab">
            <SkeletonLine width={w + 38} height={16} />
          </span>
        ))}
      </div>
      <div className="mm-toolbar" aria-hidden="true">
        <div className="mm-search"><SkeletonLine width="100%" height={40} /></div>
        <div className="mm-sort"><SkeletonLine width="100%" height={40} /></div>
        <div className="mm-toolbar-actions">
          <SkeletonLine width={96} height={40} />
          <SkeletonLine width={150} height={40} />
          <SkeletonLine width={40} height={40} />
        </div>
      </div>
      <MediaGridSkeleton />
    </div>
  );
}
