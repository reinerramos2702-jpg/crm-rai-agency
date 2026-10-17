'use client';

import React, { useId, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Lock, SlidersHorizontal } from 'lucide-react';
import { CrmDialog } from '../../contactos/_shared/CrmDialog';
import { CrmTabs, panelDomId, tabDomId } from '../../contactos/_shared/CrmTabs';
import { SearchField } from '../../contactos/_shared/SearchField';
import { normalize } from '../../contactos/_shared/crm-text';
import {
  CARD_FIELDS, DESIGN_LABELS, type CardDesign, type CardFieldId, type CardPrefs,
} from './card-prefs';
import { OpportunityCard } from './OpportunityCard';
import type { Opportunity } from './opportunity-model';

const SAMPLE: Opportunity = {
  id: 'sample', name: 'Nombre de la oportunidad', stageId: 'propuesta', status: 'open', value: 50000, contactId: null,
  contactName: 'Laura Fernández', email: '', phone: '', owner: 'Juan Díaz', business: 'Tech Innovators', source: 'Referido',
  closeDate: '2026-11-05', tags: ['vip'], createdAt: '2026-10-17T00:00:00.000Z',
};

const DESIGNS: readonly CardDesign[] = ['default', 'compact', 'unlabeled'];
const TABS = [{ id: 'campos', label: 'Campos' }, { id: 'actividades', label: 'Actividades rápidas' }] as const;
type DrawerTab = (typeof TABS)[number]['id'];

interface CustomizeCardDrawerProps {
  prefs: CardPrefs;
  onSave: (next: CardPrefs) => void;
  onClose: () => void;
}

/** Panel lateral «Personalizar la tarjeta»: los cambios se ven en la vista previa y se aplican a todo el tablero. */
export function CustomizeCardDrawer({ prefs, onSave, onClose }: CustomizeCardDrawerProps) {
  const [draft, setDraft] = useState<CardPrefs>(prefs);
  const [tab, setTab] = useState<DrawerTab>('campos');
  const [query, setQuery] = useState('');
  const radioName = useId();
  const visible = useMemo(() => CARD_FIELDS.filter((f) => normalize(f.label).includes(normalize(query))), [query]);
  const enabled = CARD_FIELDS.filter((f) => draft.fields[f.id]).length + 1;

  function toggle(id: CardFieldId) {
    setDraft((d) => ({ ...d, fields: { ...d.fields, [id]: !d.fields[id] } }));
  }

  return (
    <CrmDialog
      title="Personalizar la tarjeta"
      description="Elige qué datos se ven en cada oportunidad del tablero."
      variant="drawer"
      onClose={onClose}
      icon={<SlidersHorizontal size={18} />}
    >
      <div className="crm-dialog-form">
        <div aria-label="Vista previa de la tarjeta" role="group" className="pl-preview">
          <OpportunityCard opportunity={SAMPLE} prefs={draft} preview />
        </div>

        <fieldset className="crm-fieldset">
          <legend>Diseño de tarjeta</legend>
          <div className="pl-radios">
            {DESIGNS.map((d) => (
              <label key={d}>
                <input type="radio" name={radioName} checked={draft.design === d} onChange={() => setDraft((p) => ({ ...p, design: d }))} />
                {DESIGN_LABELS[d]}
              </label>
            ))}
          </div>
        </fieldset>

        <CrmTabs tabs={TABS.map((t) => ({ ...t, label: t.id === 'campos' ? `Campos (${enabled} de ${CARD_FIELDS.length + 1})` : t.label }))} value={tab} onChange={setTab} idPrefix="card" ariaLabel="Opciones de la tarjeta" />
        <div role="tabpanel" id={panelDomId('card', tab)} aria-labelledby={tabDomId('card', tab)} className="crm-panel">
          {tab === 'campos' ? (
            <>
              <SearchField value={query} onChange={setQuery} placeholder="Buscar campos" label="Buscar campos de la tarjeta" hotkey={false} />
              <ul className="pl-fields">
                <li><label><input type="checkbox" checked disabled /> <span>Nombre del cliente potencial</span> <Lock size={12} aria-label="Campo obligatorio" /></label></li>
                {visible.map((f) => (
                  <li key={f.id}><label><input type="checkbox" checked={draft.fields[f.id]} onChange={() => toggle(f.id)} /> <span>{f.label}</span></label></li>
                ))}
                {visible.length === 0 && <li className="crm-hint">Ningún campo coincide con «{query}».</li>}
              </ul>
            </>
          ) : (
            <p className="crm-hint">Aún no hay actividades rápidas configuradas (llamar, escribir, agendar). Llegarán con el servicio de oportunidades.</p>
          )}
        </div>

        <div className="crm-form-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="primary" onClick={() => { onSave(draft); toast.success('Tarjeta personalizada'); onClose(); }}>Aplicar</button>
        </div>
      </div>
    </CrmDialog>
  );
}
