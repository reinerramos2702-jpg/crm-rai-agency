'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Instagram, RefreshCw, Search, Sparkles } from 'lucide-react';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { CAMPAIGN_FILTERS, matchesCampaignFilter, type CampaignFilter } from './campaign-filters';

export interface DashCampaign {
  id: string;
  name: string;
  pipelineType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { executions: number };
  executions?: Array<{ id: string; status: string; tasks?: Array<{ status: string }> }>;
}

interface CampaignsSectionProps {
  /** undefined mientras carga; [] si no hay campañas. */
  campaigns: DashCampaign[] | undefined;
  failed: boolean;
  onRetry: () => void;
  onDelete: (c: DashCampaign) => void;
}

function CampaignsSkeleton() {
  return (
    <>
      <div className="dash-stats" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="dash-stat"><SkeletonLine width={36} height={36} /><div className="dash-stat-body"><SkeletonLine width={36} height={22} /><SkeletonLine width={80} height={10} /></div></div>
        ))}
      </div>
      <div className="dash-grid" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="dash-camp">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <SkeletonLine width={40} height={40} />
              <div style={{ flex: 1, display: 'grid', gap: 6 }}><SkeletonLine width="70%" height={12} /><SkeletonLine width="40%" height={10} /></div>
            </div>
            <SkeletonLine width="100%" height={8} />
          </div>
        ))}
      </div>
    </>
  );
}

/** Resumen, filtros y rejilla de campañas; con 0 campañas, una invitación compacta. */
export function CampaignsSection({ campaigns, failed, onRetry, onDelete }: CampaignsSectionProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CampaignFilter>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(campaigns ?? [])]
      .filter((c) => matchesCampaignFilter(c.status, filter) && (!q || c.name.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [campaigns, query, filter]);

  if (campaigns === undefined) {
    if (failed) {
      return (
        <p className="dash-noresults">
          <Bot size={16} /> No se pudieron cargar las campañas.
          <button type="button" onClick={onRetry}><RefreshCw size={12} /> Reintentar</button>
        </p>
      );
    }
    return <CampaignsSkeleton />;
  }

  const total = campaigns.length;
  if (total === 0) {
    return (
      <section className="dsh-empty-mini" data-tour="dash-empty" aria-labelledby="dsh-empty-title">
        <span className="dsh-empty-ico"><Sparkles size={20} /></span>
        <div className="dsh-empty-body">
          <h2 id="dsh-empty-title">Crea tu primera campaña</h2>
          <p>Cuéntale tu negocio a la IA y obtén hasta 31 días de contenido listo para Instagram.</p>
        </div>
        <div className="dsh-empty-cta">
          <Link href="/campaign/new" className="btn btn-primary"><Sparkles size={16} /> Crear campaña</Link>
          <Link href="/automatizacion" className="dash-link"><Instagram size={13} /> Planear en Contenido IG</Link>
        </div>
      </section>
    );
  }

  const completed = campaigns.filter((c) => ['done', 'completed'].includes(c.status)).length;
  const processing = campaigns.filter((c) => ['processing', 'ready'].includes(c.status)).length;
  const failedCount = campaigns.filter((c) => c.status === 'failed').length;

  return (
    <>
      <StatsBar total={total} completed={completed} processing={processing} failed={failedCount} />
      <div className="dash-toolbar" data-tour="dash-list">
        <h2>Campañas <span>{visible.length === total ? total : `${visible.length} de ${total}`}</span></h2>
        <label className="dash-search">
          <Search size={14} aria-hidden="true" />
          <input data-dash-search type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar campaña…" aria-label="Buscar campaña" />
        </label>
        <div className="dash-chips" role="group" aria-label="Filtrar por estado">
          {CAMPAIGN_FILTERS.map((f) => (
            <button key={f.id} type="button" className={`dash-chip${filter === f.id ? ' is-on' : ''}`} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="dash-noresults"><Bot size={16} /> Ninguna campaña coincide. <button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Limpiar filtros</button></p>
      ) : (
        <div className="dash-grid">
          {visible.map((c) => <CampaignCard key={c.id} campaign={c} onDelete={() => onDelete(c)} />)}
        </div>
      )}
    </>
  );
}
