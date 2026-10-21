'use client';

import React, { useMemo } from 'react';
import {
  Calendar as CalendarIcon, CalendarCheck, CalendarPlus, Clock, Copy, ExternalLink, Link2, Pencil, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AvailabilityStrip } from './AvailabilityStrip';
import { readAvailability } from './availability';
import { bookingUrl, copyText } from './calendar-api';
import { formatDuration } from './calendar-form';
import { calendarTone, typeLabel, type CalendarResource } from './calendar-types';

interface Props {
  calendar: CalendarResource;
  /** Citas confirmadas que aún no terminan. */
  upcoming: number;
  origin: string;
  onEdit: (c: CalendarResource) => void;
  onDelete: (c: CalendarResource) => void;
  onToggleStatus: (c: CalendarResource) => void;
  onSchedule: (c: CalendarResource) => void;
}

function BookingRow({ calendar, origin }: { calendar: CalendarResource; origin: string }) {
  const link = calendar.bookingEnabled ? bookingUrl(origin, calendar.bookingSlug) : null;

  async function copy() {
    if (!link) return;
    const ok = await copyText(link);
    if (ok) toast.success('Enlace de reserva copiado.');
    else toast.error('No se pudo copiar. Abre el calendario en «Editar» y copia el enlace a mano.');
  }

  if (!calendar.bookingEnabled) {
    return <div className="cal-booking is-off"><Link2 size={13} aria-hidden="true" /> Reservas online desactivadas</div>;
  }
  return (
    <div className="cal-booking">
      <span className="cal-booking-label"><Link2 size={13} aria-hidden="true" /> {link ? 'Reservas online' : 'Reservas online activas'}</span>
      {link && (
        <span className="cal-booking-actions">
          <button type="button" className="ghost btn-sm cal-mini" onClick={() => void copy()}>
            <Copy size={12} aria-hidden="true" /> Copiar enlace
          </button>
          <a
            className="cal-mini-link" href={link} target="_blank" rel="noopener noreferrer"
            aria-label={`Abrir la página de reservas de ${calendar.name} (se abre en otra pestaña)`}
            title="Abrir página de reservas"
          >
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </span>
      )}
    </div>
  );
}

/** Tarjeta de calendario: color, duración, disponibilidad semanal visual y acciones rápidas. */
export function CalendarCard({ calendar: c, upcoming, origin, onEdit, onDelete, onToggleStatus, onSchedule }: Props) {
  const availability = useMemo(() => readAvailability(c.availability), [c.availability]);
  const active = c.status === 'active';
  return (
    <article className={`card cal-card${active ? '' : ' is-off'}`} data-tone={calendarTone(c.id)} aria-labelledby={`cal-name-${c.id}`}>
      <div className="cal-card-top">
        <span className="cal-card-icon" aria-hidden="true"><CalendarIcon size={18} /></span>
        <div className="cal-card-id">
          <h3 id={`cal-name-${c.id}`} className="cal-card-name" title={c.name}>{c.name}</h3>
          <span className="cal-card-type">
            {typeLabel(c.type)}{c.group ? ` · ${c.group.name}` : ''}
          </span>
        </div>
        <button
          type="button" className="cal-status" aria-pressed={active}
          aria-label={`${c.name}: ${active ? 'activo, pulsa para desactivar' : 'inactivo, pulsa para activar'}`}
          onClick={() => onToggleStatus(c)}
        >
          <span className={`fx-dot ${active ? 'fx-dot--ok' : ''}`} aria-hidden="true" />
          {active ? 'Activo' : 'Inactivo'}
        </button>
      </div>

      <p className={`cal-card-desc${c.description ? '' : ' is-empty'}`}>{c.description || 'Sin descripción.'}</p>

      <ul className="cal-facts">
        <li><Clock size={13} aria-hidden="true" /> {formatDuration(c.durationMins)}</li>
        <li>
          <CalendarCheck size={13} aria-hidden="true" />
          {upcoming === 0 ? 'Sin citas próximas' : `${upcoming} ${upcoming === 1 ? 'cita próxima' : 'citas próximas'}`}
        </li>
      </ul>

      <AvailabilityStrip availability={availability} durationMins={c.durationMins} />
      <BookingRow calendar={c} origin={origin} />

      <div className="cal-card-foot">
        <button type="button" className="secondary btn-sm" onClick={() => onSchedule(c)}>
          <CalendarPlus size={14} aria-hidden="true" /> Agendar cita
        </button>
        <span className="cal-icon-actions">
          <button type="button" className="ghost cal-icon-btn" aria-label={`Editar ${c.name}`} title="Editar" onClick={() => onEdit(c)}>
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button type="button" className="ghost cal-icon-btn cal-icon-danger" aria-label={`Eliminar ${c.name}`} title="Eliminar" onClick={() => onDelete(c)}>
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </span>
      </div>
    </article>
  );
}
