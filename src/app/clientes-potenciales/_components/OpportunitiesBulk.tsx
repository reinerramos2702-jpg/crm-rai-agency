'use client';

import React from 'react';
import { Download, Trash2 } from 'lucide-react';
import { BulkBar } from '../../contactos/_shared/BulkBar';
import { STATUS_IDS, STATUS_LABELS, isStatus, type OpportunityStatus } from './opportunity-model';
import { STAGES, isStageId, type StageId } from './stages';

interface OpportunitiesBulkProps {
  count: number;
  onClear: () => void;
  onMove: (stageId: StageId) => void;
  onStatus: (status: OpportunityStatus) => void;
  onExport: () => void;
  onDelete: () => void;
}

/** Acciones masivas: mover de etapa, cambiar estado, exportar CSV y eliminar. */
export function OpportunitiesBulk({ count, onClear, onMove, onStatus, onExport, onDelete }: OpportunitiesBulkProps) {
  return (
    <BulkBar count={count} noun={{ one: 'oportunidad seleccionada', many: 'oportunidades seleccionadas' }} onClear={onClear}>
      <label className="crm-bulk-inline">
        <span className="fx-sr-only">Mover la selección a la etapa</span>
        <select className="input" value="" onChange={(e) => { if (isStageId(e.target.value)) onMove(e.target.value); }}>
          <option value="" disabled>Mover a etapa…</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <label className="crm-bulk-inline">
        <span className="fx-sr-only">Cambiar el estado de la selección</span>
        <select className="input" value="" onChange={(e) => { if (isStatus(e.target.value)) onStatus(e.target.value); }}>
          <option value="" disabled>Marcar como…</option>
          {STATUS_IDS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </label>
      <button type="button" className="secondary btn-sm" onClick={onExport}>
        <Download size={12} aria-hidden="true" /> Exportar CSV
      </button>
      <button type="button" className="danger btn-sm" onClick={onDelete}>
        <Trash2 size={12} aria-hidden="true" /> Eliminar
      </button>
    </BulkBar>
  );
}
