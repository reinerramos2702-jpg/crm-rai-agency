import React from 'react';
import { PreviewEmpty } from '../../contactos/_shared/PreviewEmpty';

function GhostRow() {
  return <div className="crm-ghost-row"><i className="crm-ghost-dot" /><i /><i /><i /><i /></div>;
}

/** Historial de operaciones masivas (todavía sin servicio): conserva la pantalla con una vista previa. */
export function BatchTab() {
  return (
    <>
      <div>
        <h2 className="crm-head-title">Acciones en lote</h2>
        <p className="crm-head-sub">Seguimiento de operaciones masivas sobre tus oportunidades.</p>
      </div>
      <PreviewEmpty
        title="No se han ejecutado acciones en lote"
        text="Cuando cambies de etapa, estado o elimines varias oportunidades a la vez, aquí verás el historial de cada operación."
        ghosts={<><GhostRow /><GhostRow /><GhostRow /></>}
        actions={null}
      />
    </>
  );
}
