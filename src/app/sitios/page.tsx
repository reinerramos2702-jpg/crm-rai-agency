'use client';

import React, { useMemo, useState } from 'react';
import { Globe, Plus, RotateCw, SearchX, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/HelpTip';
import { useCachedJson } from '@/lib/use-cached-json';
import { CreateSiteModal } from './_components/CreateSiteModal';
import { SitesEmpty } from './_components/SitesEmpty';
import { SiteCard } from './_components/SiteCard';
import { SitesBodySkeleton } from './_components/SitesSkeleton';
import { SitesFilters } from './_components/SitesFilters';
import { SitesSummary } from './_components/SitesSummary';
import { useDebouncedValue } from './_components/use-debounced-value';
import {
  EMPTY_FILTERS, countBy, filterSites, pluralize, summarize, type Site,
} from './_components/site-model';
import './sitios.css';

export default function SitiosPage() {
  const list = useCachedJson<{ sites: Site[] }>('/api/sites', { ttlMs: 15_000 });
  const { refresh } = list;
  const sites = useMemo(() => list.data?.sites ?? [], [list.data]);

  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<string | undefined>(undefined);
  const q = useDebouncedValue(query, 200);
  const filters = useMemo(() => ({ q, type, status }), [q, type, status]);

  const summary = useMemo(() => summarize(sites), [sites]);
  const visible = useMemo(() => filterSites(sites, filters), [sites, filters]);
  const typeFiltered = useMemo(() => filterSites(sites, filters, 'type'), [sites, filters]);
  const statusFiltered = useMemo(() => filterSites(sites, filters, 'status'), [sites, filters]);
  const typeCounts = useMemo(() => countBy(typeFiltered, 'type'), [typeFiltered]);
  const statusCounts = useMemo(() => countBy(statusFiltered, 'status'), [statusFiltered]);

  function clearFilters() {
    setQuery(EMPTY_FILTERS.q);
    setType(EMPTY_FILTERS.type);
    setStatus(EMPTY_FILTERS.status);
  }

  function openCreate(type?: string) {
    setCreateType(type);
    setShowCreate(true);
  }

  const createButton = (label: string) => (
    <button type="button" className="primary" onClick={() => openCreate()}>
      <Plus size={14} aria-hidden="true" /> {label}
    </button>
  );

  let body: React.ReactNode;
  if (list.loading) {
    body = <SitesBodySkeleton />;
  } else if (!list.data) {
    body = (
      <EmptyState
        icon={TriangleAlert} title="No se pudieron cargar los sitios"
        text="Revisa tu conexión e inténtalo de nuevo. No se perdió ningún dato."
        action={<button type="button" className="primary" onClick={() => void refresh()}><RotateCw size={14} aria-hidden="true" /> Reintentar</button>}
      />
    );
  } else if (sites.length === 0) {
    body = <SitesEmpty onCreate={openCreate} />;
  } else {
    body = (
      <>
        {list.error && (
          <p className="st-banner st-banner--err" role="alert">
            <TriangleAlert size={14} aria-hidden="true" />
            <span>No se pudo actualizar la lista. Mostrando lo último guardado.</span>
            <button type="button" className="ghost btn-sm" onClick={() => void refresh()}>Reintentar</button>
          </p>
        )}
        <SitesSummary summary={summary} />
        <SitesFilters
          query={query} onQuery={setQuery} filters={filters}
          onChange={(patch) => {
            if (patch.type !== undefined) setType(patch.type);
            if (patch.status !== undefined) setStatus(patch.status);
          }}
          onClear={clearFilters}
          typeCounts={typeCounts} statusCounts={statusCounts}
          totalByType={typeFiltered.length} totalByStatus={statusFiltered.length}
        />
        <p className="st-count" aria-live="polite">
          {visible.length === sites.length
            ? `${sites.length} ${pluralize(sites.length, 'sitio', 'sitios')}`
            : `Mostrando ${visible.length} de ${sites.length} ${pluralize(sites.length, 'sitio', 'sitios')}`}
        </p>
        {visible.length === 0 ? (
          <EmptyState
            icon={SearchX} title="Ningún sitio coincide con los filtros"
            text="Prueba con otra búsqueda o quita algún filtro para ver todos tus sitios."
            action={<button type="button" className="secondary" onClick={clearFilters}>Limpiar filtros</button>}
          />
        ) : (
          <div className="st-grid">
            {visible.map((s) => <SiteCard key={s.id} site={s} />)}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="container st-page">
      <div className="st-head">
        <div>
          <div className="st-title">
            <Globe size={20} color="var(--rai-gold)" aria-hidden="true" />
            <h1 className="h1">Sitios / Sucursales</h1>
            <HelpTip content="Locaciones físicas del negocio: hoteles, restaurantes, oficinas. Cada sitio tiene su propio inventario de habitaciones, reservas y pagos asociados." />
          </div>
          <p className="muted st-lead">Gestiona las locaciones físicas del negocio con su inventario y métricas operativas.</p>
        </div>
        <div className="st-head-actions">
          <button
            type="button" className="ghost st-refresh" aria-label="Actualizar sitios" title="Actualizar"
            disabled={list.revalidating} onClick={() => void refresh()}
          >
            <RotateCw size={14} className={list.revalidating ? 'st-spin' : undefined} aria-hidden="true" />
          </button>
          {createButton('Nuevo sitio')}
        </div>
      </div>

      {body}

      {showCreate && (
        <CreateSiteModal
          initialType={createType}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); void refresh(); }}
        />
      )}
    </div>
  );
}
