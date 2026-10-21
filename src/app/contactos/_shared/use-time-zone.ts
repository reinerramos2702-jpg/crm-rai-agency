'use client';

import { useEffect, useState } from 'react';
import { formatUtcOffset, localOffsetMinutes } from './crm-time';

export interface TimeZoneInfo {
  /** «UTC−4». Vacío hasta que el navegador monta (evita desajuste de hidratación). */
  label: string;
  /** Nombre IANA, p. ej. «America/Caracas». */
  zone: string;
}

/** Zona horaria legible del navegador, resuelta tras el montaje. */
export function useTimeZone(): TimeZoneInfo {
  const [info, setInfo] = useState<TimeZoneInfo>({ label: '', zone: '' });
  useEffect(() => {
    let zone = '';
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { zone = ''; }
    setInfo({ label: formatUtcOffset(localOffsetMinutes()), zone });
  }, []);
  return info;
}
