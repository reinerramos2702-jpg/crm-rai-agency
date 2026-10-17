'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { CrmDialog } from '../_shared/CrmDialog';
import { Field } from '../_shared/Field';
import { isEmail } from '../_shared/crm-text';

interface AddContactDialogProps {
  onClose: () => void;
  /** Devuelve `null` si se creó o el mensaje de error del servidor. */
  onCreate: (input: { name: string; email: string; phone: string }, tag?: string) => Promise<string | null>;
  /** Etiqueta de la plantilla elegida (Lead, Cliente…). */
  presetTag?: string;
}

interface Errors { name?: string; email?: string; phone?: string }

const PHONE_OK = /^[+\d\s().-]{6,30}$/;

export function validateContactForm(form: { name: string; email: string; phone: string }): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = 'Escribe el nombre del contacto.';
  if (form.email.trim() && !isEmail(form.email)) errors.email = 'Revisa el correo: falta el @ o el dominio.';
  if (form.phone.trim() && !PHONE_OK.test(form.phone.trim())) errors.phone = 'Usa solo números, espacios, + y guiones (6 a 30 caracteres).';
  return errors;
}

export function AddContactDialog({ onClose, onCreate, presetTag }: AddContactDialogProps) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const found = validateContactForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setServerError(null);
    const error = await onCreate(
      { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
      presetTag,
    );
    setSaving(false);
    if (error) { setServerError(error); return; }
    toast.success('Contacto agregado');
    onClose();
  }

  return (
    <CrmDialog
      title="Agregar contacto"
      description={presetTag ? `Se guardará con la etiqueta «${presetTag}».` : 'Solo el nombre es obligatorio; el resto puedes completarlo después.'}
      onClose={onClose}
      dismissible={!saving}
      icon={<UserPlus size={18} />}
    >
      <form className="crm-dialog-form" onSubmit={submit} noValidate>
        {serverError && <p className="crm-banner" role="alert"><span>{serverError}</span></p>}
        <div className="crm-form-grid">
          <Field label="Nombre" htmlFor="ac-name" required error={errors.name} wide>
            <input
              id="ac-name" className="input" data-autofocus="" autoComplete="off" maxLength={120} value={form.name}
              aria-invalid={Boolean(errors.name)} aria-describedby="ac-name-msg"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Correo electrónico" htmlFor="ac-email" error={errors.email}>
            <input
              id="ac-email" className="input" type="email" autoComplete="off" maxLength={160} value={form.email}
              aria-invalid={Boolean(errors.email)} aria-describedby="ac-email-msg"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Teléfono" htmlFor="ac-phone" error={errors.phone} hint="Con código de país, p. ej. +58 412 1234567">
            <input
              id="ac-phone" className="input" type="tel" autoComplete="off" maxLength={30} value={form.phone}
              aria-invalid={Boolean(errors.phone)} aria-describedby="ac-phone-msg"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
        </div>
        <div className="crm-form-actions">
          <button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Guardando…' : 'Agregar contacto'}</button>
        </div>
      </form>
    </CrmDialog>
  );
}
