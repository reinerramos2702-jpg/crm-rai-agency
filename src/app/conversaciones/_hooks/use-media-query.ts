'use client';

import { useSyncExternalStore } from 'react';

/** Coincidencia de una media query. En el servidor (y en la hidratación) vale false. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
