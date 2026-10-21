'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Dialog } from './Dialog';
import { COUNTRY_CODES, flagUrl } from '@/lib/countries';
import { digitsOnly, validateNewContact, type NewContactErrors } from '../_lib/conv-forms';
import { sendJson } from '../_lib/conv-http';
import { parseCreatedContactId } from '../_lib/conv-parse';

interface NewContactDialogProps {
  onClose: () => void;
  onCreated: (contactId: string) => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="cv-field-error" role="alert">{message}</p> : null;
}

/** Alta rápida de contacto (crea además su conversación inicial en el servidor). */
export function NewContactDialog({ onClose, onCreated }: NewContactDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [countryIdx, setCountryIdx] = useState(0); // 0 = Venezuela (+58)
  const [errors, setErrors] = useState<NewContactErrors>({});
  const [saving, setSaving] = useState(false);
  const country = COUNTRY_CODES[countryIdx] ?? COUNTRY_CODES[0];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const found = validateNewContact({ name, email, phoneLocal });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    const phone = phoneLocal ? `${country.dial} ${phoneLocal}` : '';
    const res = await sendJson('/api/contacts', 'POST', { name: name.trim(), email: email.trim(), phone });
    setSaving(false);
    const id = res.ok ? parseCreatedContactId(res.data) : null;
    if (!id) {
      toast.error(res.ok ? 'El servidor devolvió una respuesta inesperada.' : res.message, { duration: 6000 });
      return;
    }
    toast.success('Contacto creado');
    onCreated(id);
  }

  return (
    <Dialog title="Nuevo contacto" description="Se crea con una conversación lista para escribir." onClose={onClose} dismissible={!saving}>
      <form className="cv-form" onSubmit={(e) => void submit(e)} noValidate>
        <div className="cv-field">
          <label htmlFor="cv-nc-name">Nombre <span aria-hidden="true">*</span></label>
          <input
            id="cv-nc-name" data-autofocus value={name} maxLength={120} autoComplete="off" required
            aria-invalid={!!errors.name} aria-describedby={errors.name ? 'cv-nc-name-err' : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          <FieldError id="cv-nc-name-err" message={errors.name} />
        </div>
        <div className="cv-field">
          <label htmlFor="cv-nc-email">Correo (opcional)</label>
          <input
            id="cv-nc-email" type="email" value={email} maxLength={254} autoComplete="off" inputMode="email"
            aria-invalid={!!errors.email} aria-describedby={errors.email ? 'cv-nc-email-err' : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FieldError id="cv-nc-email-err" message={errors.email} />
        </div>
        <div className="cv-field">
          <label htmlFor="cv-nc-phone">Teléfono (opcional)</label>
          <div className="cv-phone">
            {/* La bandera usa una URL externa dinámica; conservar img evita exigir hosts remotos en Next Image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(country.iso2)} width={20} height={14} alt="" className="cv-flag" />
            <label htmlFor="cv-nc-country" className="fx-sr-only">País</label>
            <select id="cv-nc-country" value={countryIdx} onChange={(e) => setCountryIdx(Number(e.target.value))}>
              {COUNTRY_CODES.map((c, i) => (
                <option key={`${c.iso2}-${c.dial}`} value={i}>{c.name} ({c.dial})</option>
              ))}
            </select>
            <input
              id="cv-nc-phone" inputMode="numeric" placeholder="4242265547" value={phoneLocal} autoComplete="off"
              aria-invalid={!!errors.phoneLocal} aria-describedby={errors.phoneLocal ? 'cv-nc-phone-err' : undefined}
              onChange={(e) => setPhoneLocal(digitsOnly(e.target.value))}
            />
          </div>
          <FieldError id="cv-nc-phone-err" message={errors.phoneLocal} />
        </div>
        <div className="cv-form-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="primary" disabled={saving} aria-busy={saving}>
            {saving ? 'Creando…' : 'Crear contacto'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
