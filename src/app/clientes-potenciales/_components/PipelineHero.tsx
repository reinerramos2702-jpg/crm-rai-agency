import React from 'react';
import { Plus, Upload } from 'lucide-react';
import { notifySoon } from '../../contactos/_shared/crm-notify';
import { OPPORTUNITY_TEMPLATES, type OpportunityTemplate } from './opportunity-model';

interface PipelineHeroProps {
  onAdd: () => void;
  onTemplate: (template: OpportunityTemplate) => void;
}

/** Invitación compacta cuando el embudo está vacío: las columnas de abajo muestran la vista previa. */
export function PipelineHero({ onAdd, onTemplate }: PipelineHeroProps) {
  return (
    <section className="pl-hero" aria-labelledby="pl-hero-title">
      <div className="pl-hero-copy">
        <h2 id="pl-hero-title">Crea tu primera oportunidad</h2>
        <p>Sigue cada cliente potencial por etapa, ve cuánto vale tu embudo y mueve los tratos hasta cerrarlos.</p>
      </div>
      <div className="pl-hero-actions">
        <button type="button" className="primary" onClick={onAdd}>
          <Plus size={14} aria-hidden="true" /> Añadir oportunidad
        </button>
        <button type="button" className="secondary" onClick={() => notifySoon('Importar oportunidades')}>
          <Upload size={14} aria-hidden="true" /> Importar
        </button>
      </div>
      <div className="pl-hero-templates" role="group" aria-label="Crear desde plantilla">
        <span>Empezar con:</span>
        {OPPORTUNITY_TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="ghost btn-sm" onClick={() => onTemplate(t)}>
            <Plus size={12} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>
    </section>
  );
}
