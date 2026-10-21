'use client';

import React, { useState } from 'react';
import { Building2, CheckSquare, Layers, ListChecks, Settings, Users } from 'lucide-react';
import { ContactsTab } from './_components/ContactsTab';
import { SectionTab } from './_components/SectionTab';
import { SECTION_CONFIGS } from './_components/section-configs';
import { CrmTabs, panelDomId, tabDomId, type CrmTabItem } from './_shared/CrmTabs';
import { notifySoon } from './_shared/crm-notify';

const TOP_TABS = [
  { id: 'listas', label: 'Listas inteligentes', icon: Layers },
  { id: 'lote', label: 'Acciones en lote', icon: ListChecks },
  { id: 'tareas', label: 'Tareas', icon: CheckSquare },
  { id: 'empresas', label: 'Empresas', icon: Building2 },
] as const satisfies readonly CrmTabItem<string>[];

type TopTab = (typeof TOP_TABS)[number]['id'];

export default function ContactosPage() {
  const [tab, setTab] = useState<TopTab>('listas');

  return (
    <div className="container rai-page crm-page">
      <h1 className="h1 crm-page-title">
        <Users size={20} aria-hidden="true" /> Contactos
      </h1>

      <CrmTabs
        tabs={TOP_TABS}
        value={tab}
        onChange={setTab}
        idPrefix="top"
        ariaLabel="Secciones de Contactos"
        variant="top"
        trailing={
          <button type="button" className="ghost crm-icon-btn" aria-label="Configuración de Contactos" onClick={() => notifySoon('Configuración de Contactos')}>
            <Settings size={16} aria-hidden="true" />
          </button>
        }
      />

      <div role="tabpanel" id={panelDomId('top', tab)} aria-labelledby={tabDomId('top', tab)} className="crm-panel">
        {tab === 'listas' && <ContactsTab />}
        {tab === 'lote' && <SectionTab config={SECTION_CONFIGS.lote} />}
        {tab === 'tareas' && <SectionTab config={SECTION_CONFIGS.tareas} />}
        {tab === 'empresas' && <SectionTab config={SECTION_CONFIGS.empresas} />}
      </div>
    </div>
  );
}
