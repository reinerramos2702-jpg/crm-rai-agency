import React from 'react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import '../flows.css';

/** Esqueleto con las mismas medidas que `FlowRow` (interruptor 40×24, dos líneas, estado y acciones): sin saltos al cargar. */
export function FlowSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="fl-list" aria-busy="true" aria-label="Cargando flujos">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="fl-row fl-row--skel" aria-hidden="true">
          <SkeletonLine width={40} height={24} />
          <div className="fl-main fl-skel-main">
            <SkeletonLine width={`${50 + (i % 3) * 12}%`} height={16} />
            <SkeletonLine width="38%" height={12} />
          </div>
          <SkeletonLine width={64} height={14} />
          <span className="fl-actions fl-skel-actions">
            <SkeletonLine width={30} height={30} />
            <SkeletonLine width={30} height={30} />
            <SkeletonLine width={30} height={30} />
          </span>
        </li>
      ))}
    </ul>
  );
}
