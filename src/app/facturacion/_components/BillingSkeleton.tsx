import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';

/** Bloque del panel con las medidas finales de «Transacciones» (3 tarjetas y 5 filas). */
export function PanelSkeleton() {
  return (
    <div className="bl-skel" aria-hidden="true">
      <div className="bl-kpis">
        {[0, 1, 2].map((n) => (
          <div key={n} className="card bl-kpi">
            <SkeletonLine width="45%" height={12} />
            <SkeletonLine width="60%" height={26} />
          </div>
        ))}
      </div>
      <div className="card bl-list-skel">
        {[0, 1, 2, 3, 4].map((n) => (
          <SkeletonLine key={n} height={40} />
        ))}
      </div>
    </div>
  );
}

/** Esqueleto de la ruta: título real, banda, pestañas en una fila y panel. Mismas medidas que la página. */
export function BillingSkeleton() {
  return (
    <div className="container bl-page" aria-busy="true">
      <span className="fx-sr-only" role="status">
        Cargando…
      </span>
      <div className="bl-head">
        <div>
          <h1 className="h1">Facturación</h1>
          <p className="muted bl-sub">Facturas, pagos, productos e integraciones en un solo lugar.</p>
        </div>
        <SkeletonLine width={104} height={42} />
      </div>
      <div className="bl-band-skel">
        <SkeletonLine height={40} />
      </div>
      <div className="bl-tabs-skel">
        {[120, 150, 110, 120, 110, 100, 90, 90, 110, 110].map((w, n) => (
          <SkeletonLine key={n} width={w} height={18} />
        ))}
      </div>
      <div className="bl-panel-head">
        <SkeletonLine width={220} height={20} />
        <SkeletonLine width="min(520px, 100%)" height={14} />
      </div>
      <PanelSkeleton />
    </div>
  );
}
