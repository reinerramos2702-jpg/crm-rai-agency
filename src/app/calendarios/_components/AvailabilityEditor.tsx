'use client';

import React, { useMemo } from 'react';
import {
  clearedAvailabilityForm, defaultAvailabilityForm, everyDayAvailabilityForm, type AvailabilityForm, type DayForm,
} from './availability';
import { DAYS, type DayKey } from './calendar-types';
import { browserTimeZone } from './dates';

interface Props {
  value: AvailabilityForm;
  onChange: (next: AvailabilityForm) => void;
  error?: string;
}

/** Editor de disponibilidad semanal: un horario por día, con atajos para los patrones más comunes. */
export function AvailabilityEditor({ value, onChange, error }: Props) {
  const timeZone = useMemo(() => browserTimeZone(), []);

  function patch(key: DayKey, change: Partial<DayForm>) {
    onChange({ ...value, [key]: { ...value[key], ...change } });
  }

  return (
    <fieldset className="cal-fieldset" data-invalid={error ? 'true' : undefined} tabIndex={-1}>
      <legend>Disponibilidad semanal</legend>
      <div className="cal-presets" role="group" aria-label="Atajos de disponibilidad">
        <button type="button" className="ghost btn-sm" onClick={() => onChange(defaultAvailabilityForm())}>Lun–Vie 09:00–18:00</button>
        <button type="button" className="ghost btn-sm" onClick={() => onChange(everyDayAvailabilityForm())}>Todos los días</button>
        <button type="button" className="ghost btn-sm" onClick={() => onChange(clearedAvailabilityForm())}>Limpiar</button>
      </div>

      <div className="cal-days">
        {DAYS.map((d) => {
          const w = value[d.key];
          return (
            <div key={d.key} className={`cal-day${w.enabled ? '' : ' is-off'}`}>
              <label className="cal-day-check">
                <input type="checkbox" checked={w.enabled} onChange={(e) => patch(d.key, { enabled: e.target.checked })} />
                <span>{d.label}</span>
              </label>
              <span className="cal-day-times">
                <input
                  type="time" className="cal-time" value={w.start} disabled={!w.enabled} required
                  aria-label={`${d.label}: hora de inicio`} onChange={(e) => patch(d.key, { start: e.target.value })}
                />
                <span aria-hidden="true">–</span>
                <input
                  type="time" className="cal-time" value={w.end} disabled={!w.enabled} required
                  aria-label={`${d.label}: hora de fin`} onChange={(e) => patch(d.key, { end: e.target.value })}
                />
              </span>
            </div>
          );
        })}
      </div>

      <p className="cal-hint">
        Define los días y horarios en que este calendario acepta citas. Las citas creadas manualmente no se ven afectadas.
        {timeZone && <> Los horarios se muestran en la zona horaria de tu navegador ({timeZone}).</>}
      </p>
      {error && <p className="cal-error" role="alert">{error}</p>}
    </fieldset>
  );
}
