'use client';

import { useCallback, useEffect, useState } from 'react';
import { parsePinned, togglePinned } from '@/lib/grid-filters';

const STORAGE_KEY = 'rai-generador-fijadas-v1';

/**
 * Grillas fijadas arriba de la lista. Es una preferencia por navegador
 * (localStorage, leída en un efecto para no romper la hidratación).
 */
export function usePinnedGrids() {
  const [pinned, setPinned] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setPinned(parsePinned(localStorage.getItem(STORAGE_KEY)));
    } catch {
      /* sin storage: nada fijado */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned));
    } catch {
      /* sin storage: las fijadas duran la sesión */
    }
  }, [pinned, hydrated]);

  const toggle = useCallback((id: string) => setPinned((p) => togglePinned(p, id)), []);
  return { pinned, toggle };
}
