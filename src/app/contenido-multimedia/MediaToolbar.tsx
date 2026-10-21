'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, CheckSquare, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { SORTS, type MediaSort } from '@/lib/media-filter';

const DEBOUNCE_MS = 250;

interface MediaToolbarProps {
  query: string;
  sort: MediaSort;
  filtersOpen: boolean;
  activeFilters: number;
  visibleCount: number;
  allSelected: boolean;
  refreshing: boolean;
  onQuery: (value: string) => void;
  onSort: (value: MediaSort) => void;
  onToggleFilters: () => void;
  onToggleSelectAll: () => void;
  onRefresh: () => void;
}

export function MediaToolbar({
  query,
  sort,
  filtersOpen,
  activeFilters,
  visibleCount,
  allSelected,
  refreshing,
  onQuery,
  onSort,
  onToggleFilters,
  onToggleSelectAll,
  onRefresh,
}: MediaToolbarProps) {
  // La búsqueda se aplica 250 ms después de dejar de escribir; `emitted` evita pisar lo tecleado con el eco del padre.
  const [draft, setDraft] = useState(query);
  const emitted = useRef(query);

  useEffect(() => {
    if (query !== emitted.current) {
      emitted.current = query;
      setDraft(query);
    }
  }, [query]);

  useEffect(() => {
    if (draft === emitted.current) return undefined;
    const timer = setTimeout(() => {
      emitted.current = draft;
      onQuery(draft);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, onQuery]);

  function flush(value: string) {
    emitted.current = value;
    setDraft(value);
    onQuery(value);
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      flush(draft);
    } else if (e.key === 'Escape' && draft !== '') {
      e.preventDefault();
      e.stopPropagation();
      flush('');
    }
  }

  return (
    <div className="mm-toolbar" data-tour="mm-toolbar">
      <div className="mm-search">
        <Search size={16} className="mm-search-icon" aria-hidden="true" />
        <input
          type="search"
          className="input mm-search-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Buscar por nombre, origen o etiqueta"
          aria-label="Buscar en la biblioteca"
          maxLength={80}
          autoComplete="off"
        />
        {draft !== '' && (
          <button type="button" className="mm-search-clear" aria-label="Borrar búsqueda" onClick={() => flush('')}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="mm-sort">
        <ArrowUpDown size={15} className="mm-sort-icon" aria-hidden="true" />
        <select
          className="mm-select"
          value={sort}
          onChange={(e) => {
            const next = SORTS.find((s) => s.value === e.target.value);
            if (next) onSort(next.value);
          }}
          aria-label="Ordenar activos"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mm-toolbar-actions">
        <span className="mm-result-count" role="status">
          {visibleCount} resultado{visibleCount === 1 ? '' : 's'}
        </span>
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
        <button
          type="button"
          className={`btn-ghost btn-sm mm-icon-btn${refreshing ? ' is-spinning' : ''}`}
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Actualizar biblioteca"
          title="Actualizar biblioteca"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
}
