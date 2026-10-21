'use client';

import React from 'react';
import { Copy, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingUrl, copyText } from './calendar-api';
import type { CalendarResource } from './calendar-types';
import { useOrigin } from './use-origin';

interface Props {
  calendar: CalendarResource;
  enabled: boolean;
  onToggle: (next: boolean) => void;
}

/** Reservas online: interruptor y enlace público (el identificador se genera en el servidor al guardar). */
export function BookingSection({ calendar, enabled, onToggle }: Props) {
  const origin = useOrigin();
  const link = enabled ? bookingUrl(origin, calendar.bookingSlug) : null;

  async function copy() {
    if (!link) return;
    if (await copyText(link)) toast.success('Enlace copiado.');
    else toast.error('No se pudo copiar. Selecciona el enlace y cópialo a mano.');
  }

  return (
    <div className="cal-booking-box">
      <div className="cal-booking-head">
        <div>
          <div className="cal-booking-title"><Link2 size={14} aria-hidden="true" /> Aceptar reservas online</div>
          <p className="cal-hint" id="cal-booking-desc">
            Genera un enlace público donde los contactos pueden agendar citas según la disponibilidad de arriba.
          </p>
        </div>
        <button
          type="button" role="switch" aria-checked={enabled} aria-label="Aceptar reservas online"
          aria-describedby="cal-booking-desc" className={`rai-switch${enabled ? ' is-on' : ''}`}
          onClick={() => onToggle(!enabled)}
        >
          <span className="rai-switch-knob" />
        </button>
      </div>
      {enabled && link && (
        <div className="cal-link-row">
          <input readOnly className="input" aria-label="Enlace público de reservas" value={link} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="ghost btn-sm" onClick={() => void copy()}>
            <Copy size={14} aria-hidden="true" /> Copiar
          </button>
        </div>
      )}
      {enabled && !calendar.bookingSlug && (
        <p className="cal-hint">El enlace se generará al guardar.</p>
      )}
    </div>
  );
}
