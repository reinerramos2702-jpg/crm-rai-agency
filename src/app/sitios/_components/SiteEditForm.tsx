'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Save, TriangleAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { focusFirstInvalid } from './FormFields';
import { SiteFormFields } from './SiteFormFields';
import { useSiteForm } from './use-site-form';
import { formFromSite, toPayload, type SiteDetail } from './site-model';
import { invalidateSites, sendJson } from './sites-api';

export function SiteEditForm({ site, onCancel, onSaved }: {
  site: SiteDetail; onCancel: () => void; onSaved: () => void;
}) {
  const initial = useMemo(() => formFromSite(site), [site]);
  const form = useSiteForm(initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const dirty = JSON.stringify(form.values) !== JSON.stringify(initial);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.validate()) { focusFirstInvalid(formRef.current); return; }
    setSaving(true);
    setServerError(null);
    const res = await sendJson<{ site: { id: string } }>(`/api/sites/${site.id}`, 'PATCH', toPayload(form.values));
    setSaving(false);
    if (!res.ok) { setServerError(res.error); toast.error(res.error); return; }
    invalidateSites();
    toast.success('Cambios guardados');
    onSaved();
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="card st-edit" aria-label={`Editar ${site.name}`}>
      <div className="st-section-head">
        <h2 className="st-section-title">Editar información</h2>
      </div>
      <SiteFormFields form={form} />
      {serverError && (
        <p className="st-banner st-banner--err" role="alert">
          <TriangleAlert size={14} aria-hidden="true" /> {serverError}
        </p>
      )}
      <div className="st-actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
          <X size={14} aria-hidden="true" /> Cancelar
        </button>
        <button type="submit" className="primary" disabled={saving || !dirty} aria-busy={saving}>
          <Save size={14} aria-hidden="true" /> {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios'}
        </button>
      </div>
    </form>
  );
}
