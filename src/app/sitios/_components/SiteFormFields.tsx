'use client';

import React from 'react';
import { HelpTip } from '@/components/ui/HelpTip';
import { SITE_STATUS_LABELS } from '@/components/hotel/StatusBadges';
import { SelectField, TextField } from './FormFields';
import { TYPE_LABELS, type SiteFormErrors, type SiteFormValues } from './site-model';
import type { useSiteForm } from './use-site-form';

type SiteForm = ReturnType<typeof useSiteForm>;

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = Object.entries(SITE_STATUS_LABELS).map(([value, label]) => ({ value, label }));

/** Campos compartidos por «Nuevo sitio» y «Editar sitio». */
export function SiteFormFields({ form, autoFocusName = false }: { form: SiteForm; autoFocusName?: boolean }) {
  const { values: v, errors, set, touch } = form;
  const text = (key: keyof SiteFormValues) => ({
    value: v[key],
    error: (errors as SiteFormErrors)[key],
    onChange: (value: string) => set(key, value),
    onBlur: () => touch(key),
  });

  return (
    <div className="st-form">
      <fieldset className="st-fieldset">
        <legend>Datos generales</legend>
        <div className="st-form-grid">
          <TextField label="Nombre" required wide autoFocus={autoFocusName} maxLength={120} autoComplete="off"
            placeholder="Hotel Muévete por Vargas" {...text('name')} />
          <SelectField label="Tipo" value={v.type} onChange={(x) => set('type', x)} options={TYPE_OPTIONS} />
          <SelectField label="Estado" value={v.status} onChange={(x) => set('status', x)} options={STATUS_OPTIONS} />
          <TextField label="Aforo" type="number" inputMode="numeric" min={0}
            hint="Huéspedes máximos. 0 = sin límite definido." {...text('capacity')} />
        </div>
      </fieldset>

      <fieldset className="st-fieldset">
        <legend>Ubicación</legend>
        <div className="st-form-grid">
          <TextField label="Dirección" wide placeholder="Calle, número, referencia" autoComplete="street-address" {...text('address')} />
          <TextField label="Ciudad" autoComplete="address-level2" {...text('city')} />
          <TextField label="País" maxLength={56} placeholder="VE, DO, US…" autoComplete="country" {...text('country')} />
          <TextField label="Código postal" maxLength={20} autoComplete="postal-code" {...text('postalCode')} />
        </div>
      </fieldset>

      <fieldset className="st-fieldset">
        <legend>Contacto <HelpTip content="Persona de referencia en el sitio. Aparece en la tarjeta con acciones rápidas de llamada y correo." size={12} /></legend>
        <div className="st-form-grid">
          <TextField label="Nombre del contacto" autoComplete="name" {...text('contactName')} />
          <TextField label="Teléfono" type="tel" inputMode="tel" placeholder="+58 412 000 0000" autoComplete="tel" {...text('contactPhone')} />
          <TextField label="Correo" wide type="email" inputMode="email" placeholder="sede@empresa.com" autoComplete="email" {...text('contactEmail')} />
        </div>
      </fieldset>

      <TextField label="Notas" rows={3} maxLength={1000} hint="Horarios, accesos u observaciones internas." {...text('notes')} />
    </div>
  );
}
