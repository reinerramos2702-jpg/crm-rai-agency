import React from 'react';
import { DisabledAction } from '@/components/module-kit/DisabledAction';
import { Plus } from 'lucide-react';
import type { BillingTab } from './billing-tabs';
import { GhostPreview } from './GhostPreview';

interface EmptyPreviewProps {
  tab: BillingTab;
  /** Acción real que sustituye al botón deshabilitado (solo si existe de verdad). */
  action?: React.ReactNode;
}

/** Estado vacío con vista previa: muestra cómo se verá la sección y explica que aún no está conectada. */
export function EmptyPreview({ tab, action }: EmptyPreviewProps) {
  const titleId = `bl-empty-${tab.id}`;
  return (
    <section className="card bl-empty" aria-labelledby={titleId}>
      <GhostPreview spec={tab.preview} />
      <div className="bl-empty-copy">
        <h3 id={titleId} className="bl-empty-title">
          {tab.emptyTitle}
        </h3>
        <p className="bl-empty-text">{tab.emptyText}</p>
      </div>
      {action ?? <DisabledAction variant="primary" icon={Plus} label={tab.actionLabel} reason={tab.actionReason} />}
    </section>
  );
}
