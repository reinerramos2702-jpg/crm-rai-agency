'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import type { GridSort, GridView, StatusFilter } from '@/lib/grid-filters';

const STATUS_CHIPS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'Sin iniciar' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completadas' },
];

const SORT_OPTIONS: Array<{ value: GridSort; label: string }> = [
  { value: 'recent', label: 'Recientes' },
  { value: 'name', label: 'Nombre' },
];

interface GridFiltersProps {
  view: GridView;
  /** Conteos por estado, ya aplicada la búsqueda por nombre. */
  counts: Record<StatusFilter, number>;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: StatusFilter) => void;
  onSortChange: (sort: GridSort) => void;
}

export function GridFilters({ view, counts, onQueryChange, onStatusChange, onSortChange }: GridFiltersProps) {
  return (
    <div className="gi-filters">
      <div className="gi-filters-top">
        <div className="gi-search">
          <Search size={16} className="gi-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="gi-search-input"
            value={view.query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Buscar grillas por nombre"
            maxLength={80}
            autoComplete="off"
          />
          {view.query !== '' && (
            <button
              type="button"
              className="gi-search-clear"
              aria-label="Borrar búsqueda"
              onClick={() => onQueryChange('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="gi-sort" role="group" aria-label="Ordenar grillas">
          <span className="gi-sort-label" aria-hidden="true">Orden</span>
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="gi-seg-btn"
              aria-pressed={view.sort === value}
              onClick={() => onSortChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="gi-chips" role="group" aria-label="Filtrar por estado">
        {STATUS_CHIPS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className="gi-chip"
            aria-pressed={view.status === value}
            onClick={() => onStatusChange(value)}
          >
            {label}
            <span className="gi-chip-count">{counts[value]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
