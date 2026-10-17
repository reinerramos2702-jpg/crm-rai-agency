'use client';

import React, { useState } from 'react';
import { Building2, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog } from './Dialog';
import { focusFirstInvalid } from './FormFields';
import { SiteFormFields } from './SiteFormFields';
import { useSiteForm } from './use-site-form';
import { emptySiteForm, toPayload } from './site-model';
import { invalidateSites, sendJson } from './sites-api';

export function CreateSiteModal({ onClose, onCreated, initialType }: { onClose: () => void; onCreated: () => void; initialType?: string }) {
  const form = useSiteForm({ ...emptySiteForm(), ...(initialType ? { type: initialType } : {}) });
  const formRef = React.useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.validate()) { focusFirstInvalid(formRef.current); return; }
    setSaving(true);
    setServerError(null);
    const res = await sendJson<{ site: { id: string } }>('/api/sites', 'POST', toPayload(form.values));
    setSaving(false);
    if (!res.ok) { setServerError(res.error); toast.error(res.error); return; }
    invalidateSites();
    toast.success('Sitio creado');
    onCreated();
  }

  return (
    <Dialog
      title="Nuevo sitio" icon={<Building2 size={18} />} dismissible={!saving} onClose={onClose}
      description="Registra una locación para vincular sus habitaciones, reservas y pagos."
    >
      <form ref={formRef} onSubmit={submit} noValidate className="st-dialog-form">
        <SiteFormFields form={form} autoFocusName />
        {serverError && (
          <p className="st-banner st-banner--err" role="alert">
            <TriangleAlert size={14} aria-hidden="true" /> {serverError}
          </p>
        )}
        <div className="st-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="primary" disabled={saving} aria-busy={saving}>
            {saving ? 'Creando…' : 'Crear sitio'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
