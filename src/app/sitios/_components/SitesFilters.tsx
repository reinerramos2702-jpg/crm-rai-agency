'use client';

import React from 'react';
import { FilterX, Search, X } from 'lucide-react';
import { SITE_STATUS_LABELS } from '@/components/hotel/StatusBadges';
import { TYPE_KEYS, TYPE_LABELS, hasActiveFilters, type SiteFilters } from './site-model';

interface Props {
  query: string;
  onQuery: (q: string) => void;
  filters: SiteFilters;
  onChange: (patch: Partial<SiteFilters>) => void;
  onClear: () => void;
  typeCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  totalByType: number;
  totalByStatus: number;
}

function Chip({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" className={`st-chip${active ? ' is-on' : ''}`} aria-pressed={active} onClick={onClick}>
      {label}
      <span className="st-chip-count">{count}</span>
    </button>
  );
}

export function SitesFilters({
  query, onQuery, filters, onChange, onClear, typeCounts, statusCounts, totalByType, totalByStatus,
}: Props) {
  const active = hasActiveFilters({ ...filters, q: query });
  return (
    <section className="st-toolbar" aria-label="Buscar y filtrar sitios">
      <div className="st-search">
        <Search size={15} aria-hidden="true" className="st-search-icon" />
        <input
          className="input" type="search" value={query} onChange={(e) => onQuery(e.target.value)}
          placeholder="Nombre, ciudad o dirección" aria-label="Buscar sitios"
          autoComplete="off" enterKeyHint="search"
        />
        {query && (
          <button type="button" className="ghost st-search-clear" aria-label="Borrar búsqueda" onClick={() => onQuery('')}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="st-chip-groups">
        <div className="st-chip-group" role="group" aria-label="Filtrar por estado">
          <Chip active={!filters.status} label="Todos" count={totalByStatus} onClick={() => onChange({ status: '' })} />
          {Object.entries(SITE_STATUS_LABELS).map(([key, label]) => (
            <Chip key={key} active={filters.status === key} label={label} count={statusCounts[key] ?? 0}
              onClick={() => onChange({ status: filters.status === key ? '' : key })} />
          ))}
        </div>
        <div className="st-chip-group" role="group" aria-label="Filtrar por tipo">
          <Chip active={!filters.type} label="Todos los tipos" count={totalByType} onClick={() => onChange({ type: '' })} />
          {TYPE_KEYS.filter((k) => (typeCounts[k] ?? 0) > 0 || filters.type === k).map((key) => (
            <Chip key={key} active={filters.type === key} label={TYPE_LABELS[key] ?? key} count={typeCounts[key] ?? 0}
              onClick={() => onChange({ type: filters.type === key ? '' : key })} />
          ))}
        </div>
        {active && (
          <button type="button" className="ghost btn-sm st-clear" onClick={onClear}>
            <FilterX size={14} aria-hidden="true" /> Limpiar
          </button>
        )}
      </div>
    </section>
  );
}
