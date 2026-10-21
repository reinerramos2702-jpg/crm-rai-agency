import React from 'react';
import { ChevronDown, LayoutGrid, List, MoreVertical, Plus, Upload } from 'lucide-react';
import { notifySoon } from '../../contactos/_shared/crm-notify';
import { formatMoney, plural } from '../../contactos/_shared/crm-text';
import { PIPELINE_NAME } from './stages';

export type PipelineView = 'board' | 'list';

interface PipelineHeadProps {
  count: number;
  value: number;
  view: PipelineView;
  onView: (view: PipelineView) => void;
  onAdd: () => void;
}

export function PipelineHead({ count, value, view, onView, onAdd }: PipelineHeadProps) {
  return (
    <div className="crm-head">
      <div className="crm-head-main">
        <button type="button" className="secondary" onClick={() => notifySoon('Cambiar de embudo')}>
          {PIPELINE_NAME} <ChevronDown size={14} aria-hidden="true" />
        </button>
        <span className="badge badge-gold" aria-live="polite">{plural(count, 'cliente potencial', 'clientes potenciales')}</span>
        {count > 0 && <span className="badge badge-muted">{formatMoney(value)}</span>}
      </div>
      <div className="crm-actions">
        <div className="pl-viewtoggle" role="group" aria-label="Tipo de vista">
          <button type="button" className="pl-viewbtn" aria-pressed={view === 'board'} aria-label="Vista de tablero" onClick={() => onView('board')}>
            <LayoutGrid size={16} aria-hidden="true" />
          </button>
          <button type="button" className="pl-viewbtn" aria-pressed={view === 'list'} aria-label="Vista de lista" onClick={() => onView('list')}>
            <List size={16} aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="secondary" onClick={() => notifySoon('Importar oportunidades')}>
          <Upload size={14} aria-hidden="true" /> Importar
        </button>
        <button type="button" className="primary" onClick={onAdd}>
          <Plus size={14} aria-hidden="true" /> Añadir oportunidad
        </button>
        <button type="button" className="ghost crm-icon-btn" aria-label="Más acciones" onClick={() => notifySoon('Más acciones')}>
          <MoreVertical size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
