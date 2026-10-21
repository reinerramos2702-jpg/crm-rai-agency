import React from 'react';
import { Lock, Minus, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import type { DashPeriod } from '@/lib/dashboard-summary';
import { deltaAria, formatCount, type KpiCardModel } from './report-model';

function DeltaChip({ card, days }: { card: KpiCardModel; days: DashPeriod }) {
  const { dir, label } = card.delta;
  if (dir === 'none') return null;
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : dir === 'new' ? Sparkles : Minus;
  return (
    <span className={`rp-delta rp-delta--${dir}`} aria-label={deltaAria(card.delta, days)}>
      <Icon size={13} aria-hidden="true" />
      {label}
    </span>
  );
}

function KpiCard({ card, days }: { card: KpiCardModel; days: DashPeriod }) {
  if (card.status === 'restricted') {
    return (
      <li className="card rp-kpi rp-kpi--off">
        <span className="rp-kpi-label">{card.label}</span>
        <span className="rp-kpi-lock">
          <Lock size={14} aria-hidden="true" /> No disponible para tu rol
        </span>
      </li>
    );
  }
  return (
    <li className="card rp-kpi">
      <span className="rp-kpi-label">{card.label}</span>
      <div className="rp-kpi-line">
        <strong className="rp-kpi-value">{formatCount(card.value)}</strong>
        <DeltaChip card={card} days={days} />
      </div>
      <span className="rp-kpi-hint">{card.empty ? 'Sin actividad en este periodo ni en el anterior.' : card.hint}</span>
    </li>
  );
}

/** Tarjetas de indicadores reales (solo lectura). Cada tarjeta tiene alto fijo mínimo para evitar saltos. */
export function KpiGrid({ cards, days }: { cards: readonly KpiCardModel[]; days: DashPeriod }) {
  return (
    <ul className="rp-kpis" aria-label="Indicadores del periodo">
      {cards.map((c) => (
        <KpiCard key={c.id} card={c} days={days} />
      ))}
    </ul>
  );
}

/** Esqueleto con las medidas finales de la cuadrícula. */
export function KpiGridSkeleton({ count }: { count: number }) {
  return (
    <div className="rp-kpis" aria-hidden="true">
      {Array.from({ length: count }, (_, n) => (
        <div key={n} className="card rp-kpi">
          <SkeletonLine width="55%" height={12} />
          <SkeletonLine width="35%" height={30} />
          <SkeletonLine width="75%" height={12} />
        </div>
      ))}
    </div>
  );
}
