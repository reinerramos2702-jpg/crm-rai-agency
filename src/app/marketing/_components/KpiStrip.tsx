'use client';

import React from 'react';
import Link from 'next/link';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { marketingTabHref } from '@/lib/marketing-tabs';
import type { MarketingSummary } from './shared';

function Skeleton() {
  return (
    <div className="mkt-kpi mkt-skel-kpi" aria-hidden="true">
      <SkeletonLine width="55%" height={12} />
      <SkeletonLine width={64} height={26} />
      <SkeletonLine width="70%" height={12} />
    </div>
  );
}

export function KpiStrip({ summary }: { summary: MarketingSummary | undefined }) {
  if (!summary) {
    return <div className="mkt-kpis" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} />)}</div>;
  }
  const p = summary.posts;
  const postsHint = !p.available
    ? { text: summary.canManageContent ? 'Tabla de publicaciones pendiente' : 'Tu rol no administra contenido', cls: '' }
    : p.failed > 0
      ? { text: `${p.failed} ${p.failed === 1 ? 'fallida' : 'fallidas'} por revisar`, cls: 'is-danger' }
      : { text: `${p.published30} publicadas en 30 días${summary.publishMode === 'simulated' ? ' · modo simulado' : ''}`, cls: '' };
  const brandHint = summary.brandScore >= 100 ? 'Ficha completa' : summary.brandScore >= 60 ? 'Casi lista' : 'Completa tu ficha';

  return (
    <div className="mkt-kpis">
      <Link className="mkt-kpi" href={marketingTabHref('social')} scroll={false}>
        <span className="mkt-kpi-label">Publicaciones próximas</span>
        <strong className="mkt-kpi-value">{p.available ? p.upcoming : '—'}</strong>
        <span className={`mkt-kpi-hint ${postsHint.cls}`}>{postsHint.text}</span>
      </Link>
      <Link className="mkt-kpi" href={marketingTabHref('snippets')} scroll={false}>
        <span className="mkt-kpi-label">Fragmentos</span>
        <strong className="mkt-kpi-value">{summary.snippets}</strong>
        <span className="mkt-kpi-hint">Textos listos para reutilizar</span>
      </Link>
      <Link className="mkt-kpi" href={marketingTabHref('links')} scroll={false}>
        <span className="mkt-kpi-label">Enlaces de activación</span>
        <strong className="mkt-kpi-value">{summary.links.count}</strong>
        <span className="mkt-kpi-hint">{summary.links.clicks} {summary.links.clicks === 1 ? 'clic' : 'clics'} en total</span>
      </Link>
      <Link className="mkt-kpi" href={marketingTabHref('brand')} scroll={false}>
        <span className="mkt-kpi-label">Ficha de marca</span>
        <strong className="mkt-kpi-value">{summary.brandScore} %</strong>
        <span className={`mkt-kpi-hint ${summary.brandScore < 60 ? 'is-warn' : ''}`}>{brandHint}</span>
      </Link>
    </div>
  );
}
