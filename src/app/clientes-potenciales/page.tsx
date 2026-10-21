'use client';

import React, { useMemo, useState } from 'react';
import { ListChecks, Target, TrendingUp, Workflow } from 'lucide-react';
import { CrmTabs, panelDomId, tabDomId, type CrmTabItem } from '../contactos/_shared/CrmTabs';
import '../contactos/_shared/crm-base.css';
import '../contactos/_shared/crm-table.css';
import '../contactos/_shared/crm-overlay.css';
import { BatchTab } from './_components/BatchTab';
import { ForecastTab } from './_components/ForecastTab';
import { OpportunitiesTab } from './_components/OpportunitiesTab';
import { SequenceTab } from './_components/SequenceTab';
import { useCardPrefs } from './_components/use-card-prefs';
import { useOpportunities } from './_components/use-opportunities';
import './clientes-potenciales.css';

const TOP_TABS = [
  { id: 'oportunidades', label: 'Clientes Potenciales', icon: Target },
  { id: 'pronostico', label: 'Pronóstico', icon: TrendingUp },
  { id: 'secuencia', label: 'Secuencia', icon: Workflow },
  { id: 'lote', label: 'Acciones en lote', icon: ListChecks },
] as const satisfies readonly CrmTabItem<string>[];

type TopTab = (typeof TOP_TABS)[number]['id'];

export default function ClientesPotencialesPage() {
  const [tab, setTab] = useState<TopTab>('oportunidades');
  const store = useOpportunities();
  const { prefs, save } = useCardPrefs();
  const now = useMemo(() => new Date(), []);

  return (
    <div className="container rai-page crm-page">
      <h1 className="h1 crm-page-title">
        <Target size={20} aria-hidden="true" /> Clientes Potenciales
      </h1>

      <CrmTabs tabs={TOP_TABS} value={tab} onChange={setTab} idPrefix="pl-top" ariaLabel="Secciones de Clientes Potenciales" variant="top" />

      <div role="tabpanel" id={panelDomId('pl-top', tab)} aria-labelledby={tabDomId('pl-top', tab)} className="crm-panel">
        {tab === 'oportunidades' && <OpportunitiesTab store={store} prefs={prefs} onPrefs={save} />}
        {tab === 'pronostico' && <ForecastTab items={store.items} now={now} />}
        {tab === 'secuencia' && <SequenceTab items={store.items} />}
        {tab === 'lote' && <BatchTab />}
      </div>
    </div>
  );
}
