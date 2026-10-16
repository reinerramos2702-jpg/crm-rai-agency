'use client';

import React from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { DASH_PERIODS, KPI_LABELS, barShares, deltaInfo, type DashPeriod, type DashboardKpi } from '@/lib/dashboard-summary';

interface KpiStripProps {
  days: DashPeriod;
  onDays: (d: DashPeriod) => void;
  /** Indicadores del periodo mostrado; undefined mientras no hay datos de este periodo. */
  kpis: DashboardKpi[] | undefined;
  revalidating: boolean;
  onRefresh: () => void;
}

function KpiSkeleton() {
  return (
    <div className="dsh-kpi" aria-hidden="true">
      <SkeletonLine width="60%" height={12} />
      <div className="dsh-kpi-main"><SkeletonLine width={54} height={26} /><SkeletonLine width={46} height={18} /></div>
      <div className="dsh-kpi-bars"><SkeletonLine width="100%" height={4} /><SkeletonLine width="70%" height={4} /></div>
    </div>
  );
}

/** Indicadores con selector de periodo (7/30 días) y variación contra el periodo anterior. */
export function KpiStrip({ days, onDays, kpis, revalidating, onRefresh }: KpiStripProps) {
  const busy = kpis === undefined;
  return (
    <section className="dsh-section" data-tour="dash-kpis" aria-labelledby="dsh-kpi-title" aria-busy={busy}>
      <div className="dsh-sec-head">
        <h2 id="dsh-kpi-title">Rendimiento</h2>
        <small>Últimos {days} días frente a los {days} anteriores</small>
        <span className="dsh-spacer dsh-head-tools">
          <div className="dsh-seg" role="radiogroup" aria-label="Periodo">
            {DASH_PERIODS.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={days === p} className="dsh-seg-btn" onClick={() => onDays(p)}>
                {p} días
              </button>
            ))}
          </div>
          <button type="button" className="dsh-icon-btn" onClick={onRefresh} aria-label="Actualizar datos" title="Actualizar (R)" disabled={revalidating}>
            <RefreshCw size={14} className={revalidating ? 'animate-spin' : ''} />
          </button>
        </span>
      </div>
      <div className="dsh-kpis">
        {busy && Array.from({ length: 4 }, (_, i) => <KpiSkeleton key={i} />)}
        {kpis?.map((k) => {
          const meta = KPI_LABELS[k.id];
          const delta = deltaInfo(k.current, k.previous);
          const [cur, prev] = barShares(k.current, k.previous);
          return (
            <Link key={k.id} href={meta.href} className="dsh-kpi">
              <span className="dsh-kpi-label">{meta.label}</span>
              <div className="dsh-kpi-main">
                <strong className="dsh-kpi-value">{k.current}</strong>
                <span className={`dsh-delta is-${delta.dir}`} title={`Periodo anterior: ${k.previous}`}>{delta.label}</span>
              </div>
              <div className="dsh-kpi-bars" aria-hidden="true">
                <span className="dsh-bar"><i style={{ '--w': cur / 100 } as React.CSSProperties} /></span>
                <span className="dsh-bar is-prev"><i style={{ '--w': prev / 100 } as React.CSSProperties} /></span>
              </div>
              <span className="fx-sr-only">Periodo anterior: {k.previous}</span>
            </Link>
          );
        })}
        {kpis && kpis.length === 0 && <p className="dsh-muted">Sin indicadores disponibles para tu rol.</p>}
      </div>
    </section>
  );
}
