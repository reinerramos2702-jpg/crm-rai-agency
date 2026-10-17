import React from 'react';
import { Plug } from 'lucide-react';
import { DisabledAction } from '@/components/module-kit/DisabledAction';
import { INTEGRATIONS } from './billing-tabs';

/** Tarjetas de proveedores: todas «No conectado». El botón está deshabilitado y explica por qué. */
export function IntegrationsPanel() {
  return (
    <ul className="bl-integrations" aria-label="Proveedores de pago">
      {INTEGRATIONS.map((p) => (
        <li key={p.id} className="card bl-integration">
          <div className="bl-integration-head">
            <span className="bl-integration-logo" aria-hidden="true">
              {p.initials}
            </span>
            <div className="bl-integration-name">
              <h3>{p.name}</h3>
              <span className="badge badge-muted">
                <span className="fx-dot" aria-hidden="true" />
                No conectado
              </span>
            </div>
          </div>
          <p className="bl-integration-text">{p.description}</p>
          <p className="bl-integration-reason">{p.reason}</p>
          <DisabledAction label="Conectar" icon={Plug} reason={p.reason} small />
        </li>
      ))}
    </ul>
  );
}
