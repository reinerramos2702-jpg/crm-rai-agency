'use client';

import React from 'react';
import {
  DEFAULT_FILTERS, RANGE_FILTERS, STATUS_FILTERS, type AppointmentFilters, type RangeFilter, type StatusFilter,
} from './appointment-logic';
import type { CalendarResource } from './calendar-types';

interface Props {
  filters: AppointmentFilters;
  onChange: (next: AppointmentFilters) => void;
  counts: Record<StatusFilter, number>;
  calendars: CalendarResource[];
  /** En la vista semanal solo se ofrece el filtro por calendario. */
  calendarOnly?: boolean;
}

function isRange(value: string): value is RangeFilter {
  return RANGE_FILTERS.some((r) => r.id === value);
}

export function AppointmentFilterBar({ filters, onChange, counts, calendars, calendarOnly = false }: Props) {
  const dirty = filters.status !== DEFAULT_FILTERS.status || filters.range !== DEFAULT_FILTERS.range || filters.calendarId !== '';
  return (
    <div className="cal-filters">
      {!calendarOnly && (
        <div className="cal-chips" role="group" aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id} type="button" className="cal-chip" aria-pressed={filters.status === f.id}
              onClick={() => onChange({ ...filters, status: f.id })}
            >
              {f.label}
              <span className="cal-chip-count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      )}
      <div className="cal-filter-row">
        {!calendarOnly && (
          <label className="cal-inline-field">
            <span>Fecha</span>
            <select
              className="input" value={filters.range}
              onChange={(e) => { if (isRange(e.target.value)) onChange({ ...filters, range: e.target.value }); }}
            >
              {RANGE_FILTERS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
        )}
        <label className="cal-inline-field">
          <span>Calendario</span>
          <select className="input" value={filters.calendarId} onChange={(e) => onChange({ ...filters, calendarId: e.target.value })}>
            <option value="">Todos los calendarios</option>
            {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {dirty && (
          <button type="button" className="ghost btn-sm cal-clear" onClick={() => onChange(DEFAULT_FILTERS)}>Restablecer filtros</button>
        )}
      </div>
    </div>
  );
}
