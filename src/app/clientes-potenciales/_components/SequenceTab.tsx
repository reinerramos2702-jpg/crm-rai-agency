import React from 'react';
import { Plus } from 'lucide-react';
import { notifySoon } from '../../contactos/_shared/crm-notify';
import { formatMoney } from '../../contactos/_shared/crm-text';
import { stageVars } from './css-vars';
import { groupByStage, totals, type Opportunity } from './opportunity-model';
import { PIPELINE_NAME, STAGES } from './stages';

/** Secuencia del embudo: etapas, color, probabilidad y totales reales de la sesión. */
export function SequenceTab({ items }: { items: readonly Opportunity[] }) {
  const groups = groupByStage(items);
  return (
    <>
      <div className="crm-head">
        <div>
          <h2 className="crm-head-title">Secuencias del embudo</h2>
          <p className="crm-head-sub">{PIPELINE_NAME}: etapas y probabilidades de cierre.</p>
        </div>
        <button type="button" className="primary" onClick={() => notifySoon('Nueva secuencia')}>
          <Plus size={14} aria-hidden="true" /> Nueva secuencia
        </button>
      </div>
      <div className="crm-card">
        <div className="crm-tablewrap">
          <table className="crm-table pl-table-compact">
            <caption className="fx-sr-only">Etapas del embudo</caption>
            <thead>
              <tr><th scope="col">Etapa</th><th scope="col">Color</th><th scope="col">Probabilidad</th><th scope="col">Oportunidades</th><th scope="col">Valor</th></tr>
            </thead>
            <tbody>
              {STAGES.map((s) => {
                const t = totals(groups[s.id]);
                return (
                  <tr key={s.id} className="crm-row">
                    <td className="col-name"><strong>{s.label}</strong></td>
                    <td data-label="Color"><span className="pl-swatch" style={stageVars(s)} role="img" aria-label={`Color de ${s.label}`} /></td>
                    <td data-label="Probabilidad">{s.probability}%</td>
                    <td data-label="Oportunidades">{t.count}</td>
                    <td data-label="Valor">{formatMoney(t.value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
