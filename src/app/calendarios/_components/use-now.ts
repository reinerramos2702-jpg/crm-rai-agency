'use client';

import { useEffect, useState } from 'react';

/** Fecha actual que se refresca cada minuto (mantiene al día «próximas», «hoy» y las etiquetas relativas). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
