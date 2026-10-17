'use client';

import { useMemo } from 'react';
import { useCachedJson } from '@/lib/use-cached-json';
import type { Appointment, CalendarGroup, CalendarResource, CalendarSettings, Contact } from './calendar-types';

/** Lista cargada con caché compartida: `loading` solo mientras no hay nada que mostrar. */
export interface Resource<T> {
  items: T[];
  loading: boolean;
  /** Falló y no hay datos previos que mostrar. */
  failed: boolean;
  /** Falló la actualización pero se muestra lo último conocido. */
  stale: boolean;
  revalidating: boolean;
  refresh: () => Promise<void>;
}

interface Raw {
  data: unknown;
  error: string | null;
  loading: boolean;
  revalidating: boolean;
  refresh: () => Promise<void>;
}

function toResource<T>(items: T[], raw: Raw): Resource<T> {
  const hasData = raw.data !== undefined;
  return {
    items,
    loading: raw.loading,
    failed: !hasData && raw.error !== null,
    stale: hasData && raw.error !== null,
    revalidating: raw.revalidating,
    refresh: raw.refresh,
  };
}

/** Grupos, calendarios y citas del espacio de trabajo (los tres se muestran en varias pestañas). */
export function useCalendarData() {
  const g = useCachedJson<{ groups?: CalendarGroup[] }>('/api/calendar-groups');
  const c = useCachedJson<{ calendars?: CalendarResource[] }>('/api/calendars');
  const a = useCachedJson<{ appointments?: Appointment[] }>('/api/appointments');
  const groupItems = useMemo(() => g.data?.groups ?? [], [g.data]);
  const calendarItems = useMemo(() => c.data?.calendars ?? [], [c.data]);
  const appointmentItems = useMemo(() => a.data?.appointments ?? [], [a.data]);
  return {
    groups: toResource(groupItems, g),
    calendars: toResource(calendarItems, c),
    appointments: toResource(appointmentItems, a),
  };
}

export type CalendarData = ReturnType<typeof useCalendarData>;

/** Contactos para el selector de la cita. Solo se pide al abrir el diálogo (la ruta devuelve conversaciones y es pesada). */
export function useContactOptions() {
  const r = useCachedJson<{ contacts?: Array<{ id: string; name: string }> }>('/api/contacts', { ttlMs: 60_000 });
  const contacts = useMemo<Contact[]>(
    () => (r.data?.contacts ?? []).map((x) => ({ id: x.id, name: x.name })),
    [r.data],
  );
  return { contacts, loading: r.loading };
}

/** Ajustes del espacio (Modo privado). Solo se pide al abrir la pestaña Conexiones. */
export function useCalendarSettings() {
  const r = useCachedJson<{ settings?: CalendarSettings | null }>('/api/settings', { ttlMs: 30_000 });
  const hideDetails = r.data ? (r.data.settings?.calendarHideEventDetails ?? true) : null;
  return { hideDetails, loading: r.loading, failed: r.data === undefined && r.error !== null, refresh: r.refresh };
}
