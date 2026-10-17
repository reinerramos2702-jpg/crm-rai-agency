'use client';

import React, { useRef, useState } from 'react';
import { TriangleAlert, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog } from './Dialog';
import { Field, focusFirstInvalid } from './Field';
import { sendJson } from './calendar-api';
import { GROUP_TEMPLATES } from './calendar-types';
import { NAME_MAX, DESCRIPTION_MAX } from './calendar-form';

export function GroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState('neo');
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('El nombre del grupo es requerido.');
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setNameError(undefined);
    setServerError(null);
    setSaving(true);
    const error = await sendJson('/api/calendar-groups', 'POST', { name: trimmed, description: description.trim(), template });
    setSaving(false);
    if (error) { setServerError(error); toast.error(error); return; }
    toast.success('Grupo creado.');
    onCreated();
  }

  return (
    <Dialog
      title="Nuevo grupo" icon={<Users size={18} />} size="sm" dismissible={!saving} onClose={onClose}
      description="Agrupa calendarios relacionados, por ejemplo por equipo o por servicio."
    >
      <form ref={formRef} onSubmit={(e) => void submit(e)} noValidate className="cal-dialog-form">
        <Field label="Nombre" required error={nameError}>
          {(p) => (
            <input
              {...p} className="input" value={name} maxLength={NAME_MAX} placeholder="Ej. Equipo de ventas"
              data-autofocus="" autoComplete="off" onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Field label="Descripción (opcional)">
          {(p) => (
            <textarea
              {...p} className="input" rows={2} value={description} maxLength={DESCRIPTION_MAX}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
        <Field label="Plantilla">
          {(p) => (
            <select {...p} className="input" value={template} onChange={(e) => setTemplate(e.target.value)}>
              {GROUP_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          )}
        </Field>
        {serverError && (
          <p className="cal-banner cal-banner--err" role="alert">
            <TriangleAlert size={14} aria-hidden="true" /> <span>{serverError}</span>
          </p>
        )}
        <div className="cal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="primary" disabled={saving} aria-busy={saving}>
            {saving ? 'Creando…' : 'Crear grupo'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
