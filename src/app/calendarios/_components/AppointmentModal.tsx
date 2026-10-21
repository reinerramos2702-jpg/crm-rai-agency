'use client';

import React, { useMemo, useRef, useState } from 'react';
import { CalendarClock, Trash2, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog } from './Dialog';
import { Field, focusFirstInvalid } from './Field';
import {
  buildAppointmentPayload, NOTES_MAX, TITLE_MAX, validateAppointmentForm,
  type AppointmentErrors, type AppointmentFormState,
} from './appointment-logic';
import { sendJson } from './calendar-api';
import { APPOINTMENT_STATUSES, statusLabel, type Appointment, type CalendarResource } from './calendar-types';
import { parseDateTimeLocal, parseIso, shiftEnd, toDateTimeLocal } from './dates';
import type { AppointmentPrefill } from './modal-state';
import { useContactOptions } from './use-calendar-data';

interface Props {
  appointment: Appointment | null;
  prefill: AppointmentPrefill;
  calendars: CalendarResource[];
  onClose: () => void;
  onSaved: () => void;
  onRequestDelete: (a: Appointment) => void;
}

/** Siguiente cuarto de hora: un punto de partida razonable para una cita nueva. */
function nextQuarterHour(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15);
  return d;
}

function initialForm(appointment: Appointment | null, prefill: AppointmentPrefill, calendars: CalendarResource[]): AppointmentFormState {
  if (appointment) {
    const start = parseIso(appointment.startTime);
    const end = parseIso(appointment.endTime);
    return {
      calendarId: appointment.calendarId,
      contactId: appointment.contact?.id ?? '',
      title: appointment.title,
      notes: appointment.notes ?? '',
      start: start ? toDateTimeLocal(start) : '',
      end: end ? toDateTimeLocal(end) : '',
      status: appointment.status,
    };
  }
  const calendar = calendars.find((c) => c.id === prefill.calendarId) ?? calendars.find((c) => c.status === 'active') ?? calendars[0];
  const start = prefill.start ?? nextQuarterHour();
  const end = prefill.end ?? new Date(start.getTime() + (calendar?.durationMins ?? 30) * 60_000);
  return {
    calendarId: calendar?.id ?? '', contactId: '', title: '', notes: '',
    start: toDateTimeLocal(start), end: toDateTimeLocal(end), status: 'confirmed',
  };
}

export function AppointmentModal({ appointment, prefill, calendars, onClose, onSaved, onRequestDelete }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(() => initialForm(appointment, prefill, calendars));
  const [endTouched, setEndTouched] = useState(!!appointment || !!prefill.end);
  const [errors, setErrors] = useState<AppointmentErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { contacts, loading: contactsLoading } = useContactOptions();
  const editing = appointment !== null;

  const contactOptions = useMemo(() => {
    const current = appointment?.contact;
    return current && !contacts.some((c) => c.id === current.id) ? [current, ...contacts] : contacts;
  }, [contacts, appointment]);

  function set<K extends keyof AppointmentFormState>(key: K, value: AppointmentFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function changeStart(value: string) {
    setForm((f) => {
      const next = parseDateTimeLocal(value);
      if (!next) return { ...f, start: value };
      const end = shiftEnd(parseDateTimeLocal(f.start), parseDateTimeLocal(f.end), next);
      return { ...f, start: value, end: toDateTimeLocal(end) };
    });
    setEndTouched(true);
  }

  function changeCalendar(id: string) {
    setForm((f) => {
      const cal = calendars.find((c) => c.id === id);
      const start = parseDateTimeLocal(f.start);
      if (editing || endTouched || !cal || !start) return { ...f, calendarId: id };
      return { ...f, calendarId: id, end: toDateTimeLocal(new Date(start.getTime() + cal.durationMins * 60_000)) };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const { errors: found, start, end } = validateAppointmentForm(form);
    setErrors(found);
    if (!start || !end || Object.keys(found).length > 0) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setServerError(null);
    setSaving(true);
    const url = appointment ? `/api/appointments/${appointment.id}` : '/api/appointments';
    const error = await sendJson(url, appointment ? 'PATCH' : 'POST', buildAppointmentPayload(form, start, end));
    setSaving(false);
    if (error) { setServerError(error); toast.error(error); return; }
    toast.success(editing ? 'Cita actualizada.' : 'Cita creada.');
    onSaved();
  }

  return (
    <Dialog
      title={editing ? 'Editar cita' : 'Nueva cita'} icon={<CalendarClock size={18} />} dismissible={!saving} onClose={onClose}
      description={editing ? 'Cambia la fecha, el contacto o el estado de la cita.' : 'Agenda una cita en uno de tus calendarios.'}
    >
      <form ref={formRef} onSubmit={(e) => void submit(e)} noValidate className="cal-dialog-form">
        <Field label="Título" required error={errors.title}>
          {(p) => (
            <input
              {...p} className="input" value={form.title} maxLength={TITLE_MAX} placeholder="Ej. Llamada de seguimiento"
              data-autofocus="" autoComplete="off" onChange={(e) => set('title', e.target.value)}
            />
          )}
        </Field>

        <div className="cal-form-grid">
          <Field label="Calendario" required error={errors.calendarId}>
            {(p) => (
              <select {...p} className="input" value={form.calendarId} onChange={(e) => changeCalendar(e.target.value)}>
                {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="Contacto (opcional)">
            {(p) => (
              <select {...p} className="input" value={form.contactId} onChange={(e) => set('contactId', e.target.value)}>
                <option value="">{contactsLoading ? 'Cargando contactos…' : 'Sin contacto'}</option>
                {contactOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="Inicio" required error={errors.start}>
            {(p) => (
              <input {...p} className="input" type="datetime-local" value={form.start} onChange={(e) => changeStart(e.target.value)} />
            )}
          </Field>
          <Field label="Fin" required error={errors.end}>
            {(p) => (
              <input
                {...p} className="input" type="datetime-local" value={form.end}
                onChange={(e) => { set('end', e.target.value); setEndTouched(true); }}
              />
            )}
          </Field>
        </div>

        <Field label="Notas (opcional)">
          {(p) => (
            <textarea {...p} className="input" rows={2} maxLength={NOTES_MAX} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          )}
        </Field>
        {editing && (
          <Field label="Estado">
            {(p) => (
              <select {...p} className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            )}
          </Field>
        )}

        {serverError && (
          <p className="cal-banner cal-banner--err" role="alert">
            <TriangleAlert size={14} aria-hidden="true" /> <span>{serverError}</span>
          </p>
        )}
        <div className="cal-actions cal-actions--split">
          {appointment ? (
            <button type="button" className="danger" disabled={saving} onClick={() => onRequestDelete(appointment)}>
              <Trash2 size={14} aria-hidden="true" /> Eliminar
            </button>
          ) : <span />}
          <span className="cal-actions">
            <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="primary" disabled={saving} aria-busy={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cita'}
            </button>
          </span>
        </div>
      </form>
    </Dialog>
  );
}
