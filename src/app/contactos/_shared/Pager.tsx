'use client';

import React, { useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZES, clampPage, isPageSize, pageCount, rangeLabel, type PageSize } from './crm-paging';

interface PagerProps {
  total: number;
  page: number;
  pageSize: PageSize;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
}

/** Paginador con rango visible, filas por página y navegación Previo/Siguiente. */
export function Pager({ total, page, pageSize, onPage, onPageSize }: PagerProps) {
  const selectId = useId();
  const pages = pageCount(total, pageSize);
  const current = clampPage(page, total, pageSize);
  return (
    <nav className="crm-pager" aria-label="Paginación">
      <span className="crm-pager-range" aria-live="polite">
        {rangeLabel(total, current, pageSize)} · Página {current} de {pages}
      </span>
      <div className="crm-pager-controls">
        <label htmlFor={selectId} className="crm-pager-size">
          <span>Filas</span>
          <select
            id={selectId}
            className="input"
            value={pageSize}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (isPageSize(n)) onPageSize(n);
            }}
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button type="button" className="ghost btn-sm" disabled={current <= 1} onClick={() => onPage(current - 1)}>
          <ChevronLeft size={14} aria-hidden="true" /> Previo
        </button>
        <button type="button" className="ghost btn-sm" disabled={current >= pages} onClick={() => onPage(current + 1)}>
          Siguiente <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
