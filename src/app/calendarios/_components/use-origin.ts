'use client';

import { useEffect, useState } from 'react';

/** Origen del sitio (para armar enlaces absolutos). Vacío en el servidor y en el primer pintado: sin desajuste de hidratación. */
export function useOrigin(): string {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}
