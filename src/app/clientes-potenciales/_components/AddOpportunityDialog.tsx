'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Target } from 'lucide-react';
import { CrmDialog } from '../../contactos/_shared/CrmDialog';
import { Field } from '../../contactos/_shared/Field';
import { normalize } from '../../contactos/_shared/crm-text';
import {
  STATUS_IDS, STATUS_LABELS, emptyForm, isStatus, validateForm,
  type FormErrors, type Opportunity, type OpportunityForm,
} from './opportunity-model';
import { PIPELINE_NAME, STAGES, isStageId } from './stages';

export interface ContactOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface AddOpportunityDialogProps {
  initial?: Partial<OpportunityForm>;
  contacts: readonly ContactOption[];
  onClose: () => void;
  onCreate: (form: OpportunityForm) => Opportunity;
}

/** Alta de oportunidad. El contacto se elige de la lista real o se escribe a mano; al elegirlo se rellenan correo y teléfono. */
export function AddOpportunityDialog({ initial, contacts, onClose, onCreate }: AddOpportunityDialogProps) {
  const [form, setForm] = useState<OpportunityForm>(() => emptyForm(initial));
  const [errors, setErrors] = useState<FormErrors>({});
  const byName = useMemo(() => new Map(contacts.map((c) => [normalize(c.name), c])), [contacts]);

  function set<K extends keyof OpportunityForm>(key: K, value: OpportunityForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onContact(name: string) {
    const match = byName.get(normalize(name));
    setForm((prev) => ({
      ...prev,
      contactName: name,
      contactId: match?.id ?? null,
      email: match ? (match.email ?? prev.email) : prev.email,
      phone: match ? (match.phone ?? prev.phone) : prev.phone,
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const created = onCreate(form);
    toast.success(`«${created.name}» creada en esta sesión`);
    onClose();
  }

  const msg = (id: string) => `${id}-msg`;
  return (
    <CrmDialog
      title="Añadir una nueva oportunidad"
      description="Todavía no se guarda en el servidor: la oportunidad vive solo mientras esta página esté abierta."
      onClose={onClose}
      size="lg"
      icon={<Target size={18} />}
    >
      <form className="crm-dialog-form" onSubmit={submit} noValidate>
        <fieldset className="crm-fieldset">
          <legend>Contacto</legend>
          <div className="crm-form-grid">
            <Field label="Contacto principal" htmlFor="op-contact" required error={errors.contactName} hint={contacts.length ? 'Elige uno existente o escribe un nombre.' : undefined}>
              <input
                id="op-contact" className="input" list="op-contact-list" data-autofocus="" autoComplete="off" maxLength={120}
                value={form.contactName} aria-invalid={Boolean(errors.contactName)} aria-describedby={msg('op-contact')}
                onChange={(e) => onContact(e.target.value)}
              />
              <datalist id="op-contact-list">{contacts.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </Field>
            <Field label="Correo electrónico" htmlFor="op-email" error={errors.email}>
              <input id="op-email" className="input" type="email" autoComplete="off" maxLength={160} value={form.email} aria-invalid={Boolean(errors.email)} aria-describedby={msg('op-email')} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Teléfono" htmlFor="op-phone">
              <input id="op-phone" className="input" type="tel" autoComplete="off" maxLength={30} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="crm-fieldset">
          <legend>Oportunidad</legend>
          <div className="crm-form-grid">
            <Field label="Nombre del cliente potencial" htmlFor="op-name" required error={errors.name} wide>
              <input id="op-name" className="input" autoComplete="off" maxLength={120} value={form.name} aria-invalid={Boolean(errors.name)} aria-describedby={msg('op-name')} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Embudo" htmlFor="op-pipeline">
              <select id="op-pipeline" className="input" disabled><option>{PIPELINE_NAME}</option></select>
            </Field>
            <Field label="Etapa" htmlFor="op-stage">
              <select id="op-stage" className="input" value={form.stageId} onChange={(e) => { if (isStageId(e.target.value)) set('stageId', e.target.value); }}>
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Estado" htmlFor="op-status">
              <select id="op-status" className="input" value={form.status} onChange={(e) => { if (isStatus(e.target.value)) set('status', e.target.value); }}>
                {STATUS_IDS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field label="Valor (€)" htmlFor="op-value" error={errors.value}>
              <input id="op-value" className="input" inputMode="decimal" autoComplete="off" placeholder="0,00" value={form.value} aria-invalid={Boolean(errors.value)} aria-describedby={msg('op-value')} onChange={(e) => set('value', e.target.value)} />
            </Field>
            <Field label="Propietario" htmlFor="op-owner">
              <input id="op-owner" className="input" autoComplete="off" maxLength={80} placeholder="Sin asignar" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
            </Field>
            <Field label="Nombre del negocio" htmlFor="op-business">
              <input id="op-business" className="input" autoComplete="off" maxLength={120} value={form.business} onChange={(e) => set('business', e.target.value)} />
            </Field>
            <Field label="Fuente" htmlFor="op-source">
              <input id="op-source" className="input" autoComplete="off" maxLength={80} value={form.source} onChange={(e) => set('source', e.target.value)} />
            </Field>
            <Field label="Fecha de cierre estimada" htmlFor="op-close" error={errors.closeDate}>
              <input id="op-close" className="input" type="date" value={form.closeDate} aria-invalid={Boolean(errors.closeDate)} aria-describedby={msg('op-close')} onChange={(e) => set('closeDate', e.target.value)} />
            </Field>
            <Field label="Etiquetas" htmlFor="op-tags" hint="Separadas por comas">
              <input id="op-tags" className="input" autoComplete="off" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
            </Field>
          </div>
        </fieldset>

        <div className="crm-form-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary">Crear</button>
        </div>
      </form>
    </CrmDialog>
  );
}
