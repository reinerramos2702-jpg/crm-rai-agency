'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_GRID_VIEW, parseGridView, type GridSort, type GridView, type StatusFilter } from '@/lib/grid-filters';

const STORAGE_KEY = 'rai-generador-vista-v1';

/**
 * «Vista guardada» de la lista de grillas (búsqueda, estado y orden).
 * La lectura de localStorage ocurre en un efecto —nunca en el inicializador del
 * estado— para no romper la hidratación; hasta entonces rige la vista por defecto.
 */
export function useGridView() {
  const [view, setView] = useState<GridView>(DEFAULT_GRID_VIEW);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setView(parseGridView(localStorage.getItem(STORAGE_KEY)));
    } catch {
      /* sin storage: se queda la vista por defecto */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
    } catch {
      /* sin storage: la vista solo dura la sesión */
    }
  }, [view, hydrated]);

  const setQuery = useCallback((query: string) => setView((v) => ({ ...v, query })), []);
  const setStatus = useCallback((status: StatusFilter) => setView((v) => ({ ...v, status })), []);
  const setSort = useCallback((sort: GridSort) => setView((v) => ({ ...v, sort })), []);
  /** Quita búsqueda y estado; el orden elegido se conserva. */
  const clearFilters = useCallback(() => setView((v) => ({ ...v, query: '', status: 'all' })), []);

  return { view, setQuery, setStatus, setSort, clearFilters };
}
