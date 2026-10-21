import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';

/** Esqueleto con las medidas finales de la columna de grupos. */
export function GroupsSkeleton() {
  return (
    <div className="cal-group-list" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="cal-group cal-group--skel"><SkeletonLine width={i === 0 ? 120 : 84} height={14} /></div>
      ))}
    </div>
  );
}

/** Tarjeta de esqueleto con las mismas partes y alturas fijas que `CalendarCard` (sin saltos de diseño). */
export function CalendarCardSkeleton() {
  return (
    <div className="card cal-card cal-card--skel" aria-hidden="true">
      <div className="cal-card-top">
        <span className="fx-shimmer cal-skel-icon" />
        <div className="cal-card-id" style={{ display: 'grid', gap: 8 }}>
          <SkeletonLine width="65%" height={16} />
          <SkeletonLine width="35%" height={11} />
        </div>
        <SkeletonLine width={78} height={30} />
      </div>
      <div className="cal-card-desc cal-skel-block">
        <SkeletonLine width="88%" height={12} />
        <SkeletonLine width="56%" height={12} />
      </div>
      <div className="cal-facts cal-skel-block">
        <SkeletonLine width="70%" height={12} />
      </div>
      <div className="cal-avail">
        <div className="cal-avail-bars">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="cal-avail-day"><span className="fx-shimmer cal-avail-track" /></div>
          ))}
        </div>
        <div className="cal-avail-text" style={{ display: 'grid', gap: 8 }}>
          <SkeletonLine width="80%" height={12} />
          <SkeletonLine width="55%" height={10} />
        </div>
      </div>
      <div className="cal-booking cal-skel-block">
        <SkeletonLine width="50%" height={12} />
      </div>
      <div className="cal-card-foot">
        <SkeletonLine width={124} height={30} />
        <SkeletonLine width={72} height={32} />
      </div>
    </div>
  );
}

/** Rejilla de tarjetas de esqueleto. */
export function CalendarGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="cal-grid" aria-busy="true">
      <span className="fx-sr-only" role="status">Cargando calendarios…</span>
      {Array.from({ length: count }, (_, i) => <CalendarCardSkeleton key={i} />)}
    </div>
  );
}

/** Esqueleto de la agenda: filas con la misma estructura y alto que `AppointmentRow`. */
export function AgendaSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="cal-agenda-skel" aria-busy="true">
      <span className="fx-sr-only" role="status">Cargando citas…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card cal-appt cal-appt--skel" aria-hidden="true">
          <div className="cal-appt-time"><SkeletonLine width={40} height={15} /><SkeletonLine width={32} height={11} /></div>
          <div className="cal-appt-main" style={{ display: 'grid', gap: 8 }}>
            <SkeletonLine width="60%" height={15} />
            <SkeletonLine width="40%" height={11} />
          </div>
          <SkeletonLine width={84} height={22} />
          <SkeletonLine width={96} height={32} />
        </div>
      ))}
    </div>
  );
}
