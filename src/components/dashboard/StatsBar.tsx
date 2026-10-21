'use client';

import React from 'react';
import { Layers, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface StatsBarProps {
  total: number;
  completed: number;
  processing: number;
  failed: number;
}

/**
 * Resumen de campañas por estado. Cada tarjeta muestra su proporción del total
 * con una barra fina (informa sin ruido). Responsive: 4 → 2 → 1 columnas.
 */
export function StatsBar({ total, completed, processing, failed }: StatsBarProps) {
  const stats = [
    { label: 'Total campañas', value: total, icon: Layers, color: 'var(--rai-gold)', share: 100 },
    { label: 'Completadas', value: completed, icon: CheckCircle2, color: 'var(--rai-success)', share: total ? (completed / total) * 100 : 0 },
    { label: 'En proceso', value: processing, icon: Clock, color: 'var(--rai-purple)', share: total ? (processing / total) * 100 : 0 },
    { label: 'Con errores', value: failed, icon: AlertCircle, color: 'var(--rai-error)', share: total ? (failed / total) * 100 : 0 },
  ];

  return (
    <div className="dash-stats" data-tour="dash-stats" role="list">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="dash-stat" role="listitem" style={{ '--sc': s.color, '--share': `${Math.round(s.share)}%` } as React.CSSProperties}>
            <span className="dash-stat-ico"><Icon size={17} /></span>
            <div className="dash-stat-body">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
            <i className="dash-stat-bar" aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
}
