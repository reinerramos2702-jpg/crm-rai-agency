'use client';

import React, { useRef, useState } from 'react';
import { Calendar as CalendarIcon, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { AvailabilityEditor } from './AvailabilityEditor';
import { BookingSection } from './BookingSection';
import { Dialog } from './Dialog';
import { Field, focusFirstInvalid } from './Field';
import { sendJson } from './calendar-api';
import {
  applyTemplate, buildCalendarPayload, calendarToForm, DESCRIPTION_MAX, emptyCalendarForm, formatDuration,
  MAX_DURATION, MIN_DURATION, NAME_MAX, validateCalendarForm, type CalendarFormErrors, type CalendarFormState,
} from './calendar-form';
import { CALENDAR_TYPES, type CalendarGroup, type CalendarResource } from './calendar-types';
import { CALENDAR_TEMPLATES, type CalendarTemplate } from './templates';

interface Props {
  /** null = calendario nuevo. */
  calendar: CalendarResource | null;
  template: CalendarTemplate | null;
  groupId: string;
  groups: CalendarGroup[];
  onClose: () => void;
  onSaved: () => void;
}

const QUICK_DURATIONS = [15, 30, 45, 60, 90] as const;

function initialForm({ calendar, template, groupId }: Pick<Props, 'calendar' | 'template' | 'groupId'>): CalendarFormState {
  if (calendar) return calendarToForm(calendar);
  const base = emptyCalendarForm(groupId);
  return template ? applyTemplate(base, template) : base;
}

export function CalendarFormModal({ calendar, template, groupId, groups, onClose, onSaved }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<CalendarFormState>(() => initialForm({ calendar, template, groupId }));
  const [activeTemplate, setActiveTemplate] = useState<string | null>(template?.id ?? null);
  const [errors, setErrors] = useState<CalendarFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = calendar !== null;

  function set<K extends keyof CalendarFormState>(key: K, value: CalendarFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const found = validateCalendarForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setServerError(null);
    setSaving(true);
    const url = calendar ? `/api/calendars/${calendar.id}` : '/api/calendars';
    const error = await sendJson(url, calendar ? 'PATCH' : 'POST', buildCalendarPayload(form, editing));
    setSaving(false);
    if (error) { setServerError(error); toast.error(error); return; }
    toast.success(editing ? 'Calendario actualizado.' : 'Calendario creado.');
    onSaved();
  }

  return (
    <Dialog
      title={editing ? 'Editar calendario' : 'Nuevo calendario'} icon={<CalendarIcon size={18} />} size="lg"
      dismissible={!saving} onClose={onClose}
      description={editing ? 'Cambia la duración, la disponibilidad o las reservas online.' : 'Define cuánto dura cada cita y cuándo estás disponible.'}
    >
      <form ref={formRef} onSubmit={(e) => void submit(e)} noValidate className="cal-dialog-form">
        {!editing && (
          <div className="cal-chips-block" role="group" aria-label="Plantillas de arranque">
            <span className="cal-chips-label">Plantilla</span>
            <div className="cal-chips">
              {CALENDAR_TEMPLATES.map((t) => (
                <button
                  key={t.id} type="button" className="cal-chip" aria-pressed={activeTemplate === t.id}
                  onClick={() => { setForm((f) => applyTemplate(f, t)); setActiveTemplate(t.id); setErrors({}); }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Field label="Nombre" required error={errors.name}>
          {(p) => (
            <input
              {...p} className="input" value={form.name} maxLength={NAME_MAX} placeholder="Ej. Reunión de descubrimiento"
              data-autofocus="" autoComplete="off" onChange={(e) => set('name', e.target.value)}
            />
          )}
        </Field>
        <Field label="Descripción (opcional)" error={errors.description}>
          {(p) => (
            <textarea
              {...p} className="input" rows={2} value={form.description} maxLength={DESCRIPTION_MAX}
              onChange={(e) => set('description', e.target.value)}
            />
          )}
        </Field>

        <div className="cal-form-grid">
          <Field label="Tipo">
            {(p) => (
              <select {...p} className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
                {CALENDAR_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            )}
          </Field>
          <Field label="Grupo (opcional)">
            {(p) => (
              <select {...p} className="input" value={form.groupId} onChange={(e) => set('groupId', e.target.value)}>
                <option value="">Sin grupo</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          </Field>
          <Field
            label="Duración (min)" required error={errors.durationMins}
            hint={`Entre ${MIN_DURATION} y ${MAX_DURATION} minutos.`}
          >
            {(p) => (
              <input
                {...p} className="input" type="number" inputMode="numeric" min={MIN_DURATION} max={MAX_DURATION} step={5}
                value={form.durationMins} onChange={(e) => set('durationMins', e.target.value)}
              />
            )}
          </Field>
          <div className="cal-chips-block" role="group" aria-label="Duraciones frecuentes">
            <span className="cal-chips-label">Duraciones frecuentes</span>
            <div className="cal-chips">
              {QUICK_DURATIONS.map((m) => (
                <button
                  key={m} type="button" className="cal-chip" aria-pressed={form.durationMins === String(m)}
                  onClick={() => set('durationMins', String(m))}
                >
                  {formatDuration(m)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AvailabilityEditor value={form.availability} error={errors.availability} onChange={(v) => set('availability', v)} />

        {calendar ? (
          <BookingSection calendar={calendar} enabled={form.bookingEnabled} onToggle={(v) => set('bookingEnabled', v)} />
        ) : (
          <p className="cal-hint">Podrás activar las reservas online y obtener el enlace público después de crear el calendario.</p>
        )}

        {serverError && (
          <p className="cal-banner cal-banner--err" role="alert">
            <TriangleAlert size={14} aria-hidden="true" /> <span>{serverError}</span>
          </p>
        )}
        <div className="cal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="primary" disabled={saving} aria-busy={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear calendario'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
