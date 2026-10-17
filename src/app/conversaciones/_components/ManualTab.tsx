import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { TabFrame } from './TabFrame';

export function ManualTab() {
  return (
    <TabFrame intro="Las acciones manuales son tareas que requieren llamadas o SMS manuales a tus contactos.">
      <div className="card cv-empty-card">
        <CheckCircle2 size={22} aria-hidden="true" className="cv-ok-icon" />
        <p>¡Buen trabajo! No tienes tareas pendientes.</p>
      </div>
      <p className="cv-note"><Info size={12} aria-hidden="true" /> Sección en construcción.</p>
    </TabFrame>
  );
}
