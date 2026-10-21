import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { MARKETING_TABS } from '@/lib/marketing-tabs';

/** Piezas de esqueleto con las medidas reales de cada bloque (sin saltos al cargar). Sin estado: sirven también en loading.tsx. */

export function KpiSkeletonGrid() {
  return (
    <div className="mkt-kpis" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="mkt-kpi">
          <div className="mkt-kpi-top"><SkeletonLine width={24} height={24} /><SkeletonLine width="55%" height={12} /></div>
          <SkeletonLine width={64} height={28} />
          <SkeletonLine height={6} />
          <SkeletonLine width="70%" height={12} />
        </div>
      ))}
    </div>
  );
}

export function StatusSkeleton() {
  return (
    <div className="mkt-status" aria-hidden="true">
      <SkeletonLine width={120} height={28} />
      <SkeletonLine width={96} height={28} />
    </div>
  );
}

export function TabsSkeleton() {
  return (
    <div className="mkt-skel-tabs" aria-hidden="true">
      {MARKETING_TABS.map((t) => <SkeletonLine key={t.id} width={t.label.length * 7 + 44} height={24} />)}
    </div>
  );
}

/** Filas de lista (fragmentos, enlaces, plantillas): misma altura que `.mkt-item`. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true">
      <span className="fx-sr-only">Cargando…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="mkt-skel-item" aria-hidden="true">
          <div className="mkt-skel-lines"><SkeletonLine width={i % 2 ? '45%' : '60%'} height={14} /><SkeletonLine width="80%" height={12} /></div>
          <SkeletonLine width={72} height={34} />
        </div>
      ))}
    </div>
  );
}

/** Calendario mensual: encabezado de días y semanas con la altura de las celdas reales. */
export function CalendarSkeleton({ weeks = 5 }: { weeks?: number }) {
  return (
    <div className="mkt-cal mkt-cal-skel" role="status" aria-busy="true">
      <span className="fx-sr-only">Cargando calendario…</span>
      <div className="mkt-cal-head" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <span key={i}>&nbsp;</span>)}</div>
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} className="mkt-cal-week" aria-hidden="true">
          {Array.from({ length: 7 }, (_, d) => (
            <div key={d} className="mkt-day-skel"><SkeletonLine width={20} height={12} /></div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Planificador completo: barra, filtros y calendario. */
export function PlannerSkeleton() {
  return (
    <div className="card" aria-busy="true">
      <div className="mkt-cal-bar" aria-hidden="true"><SkeletonLine width={34} height={34} /><SkeletonLine width={150} height={22} /><SkeletonLine width={34} height={34} /><SkeletonLine width={180} height={34} /></div>
      <div className="mkt-chips" style={{ marginBottom: 12 }} aria-hidden="true"><SkeletonLine width={260} height={28} /></div>
      <CalendarSkeleton />
    </div>
  );
}

/** Tarjeta de formulario genérica: título + campos. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="card mkt-skel-block" role="status" aria-busy="true">
      <span className="fx-sr-only">Cargando…</span>
      <SkeletonLine width="40%" height={18} />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="mkt-skel-lines" aria-hidden="true"><SkeletonLine width="30%" height={12} /><SkeletonLine height={40} /></div>
      ))}
    </div>
  );
}

/** Dos tarjetas lado a lado (Marca, Cuenta atrás): `idle` detiene el brillo cuando la carga ya falló. */
export function SplitSkeleton({ idle = false, fields = 4 }: { idle?: boolean; fields?: number }) {
  return (
    <div className={`mkt-split${idle ? ' mkt-idle' : ''}`}>
      <FormSkeleton fields={fields} />
      <FormSkeleton fields={fields} />
    </div>
  );
}
