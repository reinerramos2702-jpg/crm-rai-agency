import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { MARKETING_TABS } from '@/lib/marketing-tabs';

/** Esqueleto de /marketing con las medidas reales de cada bloque (sin saltos al cargar). Sin estado: sirve de loading.tsx y de respaldo de Suspense. */
export function MarketingSkeleton() {
  return (
    <div className="container mkt-page" aria-busy="true" aria-live="polite">
      <span className="fx-sr-only" role="status">Cargando…</span>
      <div className="mkt-head">
        <div>
          <h1>Marketing</h1>
          <p className="muted">Planifica publicaciones, mide enlaces y cuida tu marca desde un solo lugar.</p>
        </div>
      </div>
      <div className="mkt-kpis">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="mkt-kpi mkt-skel-kpi" aria-hidden="true">
            <SkeletonLine width="55%" height={12} />
            <SkeletonLine width={64} height={26} />
            <SkeletonLine width="70%" height={12} />
          </div>
        ))}
      </div>
      <div className="mkt-tabs" aria-hidden="true">
        {MARKETING_TABS.map((t) => <SkeletonLine key={t.id} width={t.label.length * 8 + 40} height={34} />)}
      </div>
      <div className="card mkt-skel-panel" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
        {Array.from({ length: 6 }, (_, i) => <SkeletonLine key={i} height={16} width={i % 2 ? '88%' : '100%'} />)}
      </div>
    </div>
  );
}
