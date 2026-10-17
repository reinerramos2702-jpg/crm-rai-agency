'use client';

import { useEffect, useState } from 'react';

/** Devuelve `value` tras `delayMs` sin cambios (búsqueda sin filtrar en cada tecla). */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
