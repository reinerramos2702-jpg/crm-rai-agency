'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { ScrollTabs } from '@/components/module-kit/ScrollTabs';
import { DisabledAction } from '@/components/module-kit/DisabledAction';
import { NoticeBand } from '@/components/module-kit/NoticeBand';
import { panelDomId, tabDomId } from '@/components/module-kit/tabs-nav';
import { BILLING_TABS, tabById, type BillingTab } from './_components/billing-tabs';
import { EmptyPreview } from './_components/EmptyPreview';
import { IntegrationsPanel } from './_components/IntegrationsPanel';
import { TransactionsPanel } from './_components/TransactionsPanel';
import './_components/facturacion.css';

const PREFIX = 'bl';

function PanelBody({ tab }: { tab: BillingTab }) {
  if (tab.id === 'integrations') return <IntegrationsPanel />;
  if (tab.id === 'transactions') return <TransactionsPanel />;
  return <EmptyPreview tab={tab} />;
}

export default function FacturacionPage() {
  const [activeId, setActiveId] = useState<string>(BILLING_TABS[0].id);
  const tab = tabById(activeId);

  return (
    <div className="container bl-page">
      <header className="bl-head">
        <div>
          <h1 className="h1">Facturación</h1>
          <p className="muted bl-sub">Facturas, pagos, productos e integraciones en un solo lugar.</p>
        </div>
        <DisabledAction
          variant="primary"
          icon={Plus}
          label="Nuevo"
          align="end"
          reason="Todavía no se pueden crear facturas, productos ni cupones: falta conectar un proveedor de pagos."
        />
      </header>

      <NoticeBand className="bl-band">
        <strong>Próximamente:</strong> conexión con PayPal, Stripe y Mercado Pago. Hoy solo «Transacciones» muestra datos reales; el resto son vistas previas.
      </NoticeBand>

      <ScrollTabs tabs={BILLING_TABS} active={tab.id} onChange={setActiveId} label="Secciones de facturación" idPrefix={PREFIX} />

      <section id={panelDomId(PREFIX)} role="tabpanel" aria-labelledby={tabDomId(PREFIX, tab.id)} tabIndex={0} className="bl-panel">
        <div className="bl-panel-head">
          <div className="bl-panel-title">
            <h2>{tab.label}</h2>
            <span className={`badge ${tab.live ? 'badge-success' : 'badge-muted'}`}>{tab.live ? 'Datos reales' : 'Vista previa'}</span>
          </div>
          <p className="muted">{tab.description}</p>
        </div>
        <PanelBody tab={tab} />
      </section>
    </div>
  );
}
