'use client';

import React from 'react';
import { Pencil, Trash2, User, X } from 'lucide-react';
import type { TimedAppointment } from './appointment-logic';
import { calendarTone, statusLabel, statusTone } from './calendar-types';
import { fmtTime } from './dates';

interface Props {
  t: TimedAppointment;
  onEdit: (a: TimedAppointment['item']) => void;
  onCancel: (a: TimedAppointment['item']) => void;
  onDelete: (a: TimedAppointment['item']) => void;
}

/** Fila de la agenda: hora, título, calendario, contacto, estado y acciones. */
export function AppointmentRow({ t, onEdit, onCancel, onDelete }: Props) {
  const a = t.item;
  const cancelled = a.status === 'cancelled';
  return (
    <li className={`card cal-appt${cancelled ? ' is-cancelled' : ''}`} data-tone={calendarTone(a.calendarId)}>
      <div className="cal-appt-time">
        <strong>{fmtTime(t.start)}</strong>
        <span>{fmtTime(t.end)}</span>
      </div>
      <div className="cal-appt-main">
        <h3 className="cal-appt-title">{a.title}</h3>
        {a.notes && <p className="cal-appt-notes">{a.notes}</p>}
        <p className="cal-appt-meta">
          <span className="cal-appt-cal"><i className="cal-swatch" aria-hidden="true" />{a.calendar?.name ?? '—'}</span>
          <span className="cal-appt-contact"><User size={12} aria-hidden="true" />{a.contact?.name ?? 'Sin contacto'}</span>
        </p>
      </div>
      <span className="cal-pill" data-tone={statusTone(a.status)}>{statusLabel(a.status)}</span>
      <span className="cal-icon-actions">
        <button type="button" className="ghost cal-icon-btn" aria-label={`Editar la cita ${a.title}`} title="Editar" onClick={() => onEdit(a)}>
          <Pencil size={14} aria-hidden="true" />
        </button>
        {!cancelled && (
          <button type="button" className="ghost cal-icon-btn" aria-label={`Cancelar la cita ${a.title}`} title="Cancelar cita" onClick={() => onCancel(a)}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
        <button type="button" className="ghost cal-icon-btn cal-icon-danger" aria-label={`Eliminar la cita ${a.title}`} title="Eliminar" onClick={() => onDelete(a)}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </span>
    </li>
  );
}
