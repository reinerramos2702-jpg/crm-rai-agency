'use client';

import React from 'react';
import { CheckSquare, Search, SlidersHorizontal, X } from 'lucide-react';
import { SORTS, type MediaSort } from '@/lib/media-filter';

interface MediaToolbarProps {
  query: string;
  sort: MediaSort;
  filtersOpen: boolean;
  activeFilters: number;
  visibleCount: number;
  allSelected: boolean;
  onQuery: (value: string) => void;
  onSort: (value: MediaSort) => void;
  onToggleFilters: () => void;
  onToggleSelectAll: () => void;
}

export function MediaToolbar({
  query,
  sort,
  filtersOpen,
  activeFilters,
  visibleCount,
  allSelected,
  onQuery,
  onSort,
  onToggleFilters,
  onToggleSelectAll,
}: MediaToolbarProps) {
  return (
    <div className="mm-toolbar" data-tour="mm-toolbar">
      <div className="mm-search">
        <Search size={16} className="mm-search-icon" aria-hidden="true" />
        <input
          type="search"
          className="input mm-search-input"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar por nombre, origen o etiqueta"
          aria-label="Buscar en la biblioteca"
          maxLength={80}
          autoComplete="off"
        />
        {query !== '' && (
          <button type="button" className="mm-search-clear" aria-label="Borrar búsqueda" onClick={() => onQuery('')}>
            <X size={14} />
          </button>
        )}
      </div>

      <select
        className="mm-select"
        value={sort}
        onChange={(e) => onSort(e.target.value as MediaSort)}
        aria-label="Ordenar activos"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <div className="mm-toolbar-actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          aria-expanded={filtersOpen}
          aria-controls="mm-filters"
          onClick={onToggleFilters}
        >
          <SlidersHorizontal size={14} /> Filtros
          {activeFilters > 0 && <span className="mm-badge-dot">{activeFilters}</span>}
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={visibleCount === 0}
          aria-pressed={allSelected}
          onClick={onToggleSelectAll}
        >
          <CheckSquare size={14} /> {allSelected ? 'Quitar selección' : 'Seleccionar visibles'}
        </button>
      </div>
    </div>
  );
}
