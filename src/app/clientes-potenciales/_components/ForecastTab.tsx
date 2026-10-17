import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatMoney, plural } from '../../contactos/_shared/crm-text';
import { forecast, groupByStage, totals, type Opportunity } from './opportunity-model';
import { STAGES } from './stages';

/** Pronóstico: oportunidades abiertas según su fecha de cierre estimada, ponderadas por la probabilidad de su etapa. */
export function ForecastTab({ items, now }: { items: readonly Opportunity[]; now: Date }) {
  const periods = forecast(items, now);
  const groups = groupByStage(items.filter((o) => o.status === 'open'));
  const hasData = periods.some((p) => p.count > 0);
  return (
    <>
      <div>
        <h2 className="crm-head-title">Pronóstico de ventas</h2>
        <p className="crm-head-sub">Estimaciones de cierre por etapa y por periodo.</p>
      </div>
      <div className="pl-kpis">
        {periods.map((p) => (
          <article key={p.id} className="crm-card pl-kpi">
            <h3>{p.label}</h3>
            <p className="pl-kpi-value">{formatMoney(p.weighted)}</p>
            <p className="crm-hint">
              ponderado de {formatMoney(p.value)} · {plural(p.count, 'oportunidad', 'oportunidades')} · {p.avgProbability}% de probabilidad media
            </p>
          </article>
        ))}
      </div>
      {hasData ? (
        <div className="crm-card">
          <div className="crm-tablewrap">
            <table className="crm-table pl-table-compact">
              <caption className="fx-sr-only">Oportunidades abiertas por etapa</caption>
              <thead><tr><th scope="col">Etapa</th><th scope="col">Probabilidad</th><th scope="col">Oportunidades</th><th scope="col">Valor</th></tr></thead>
              <tbody>
                {STAGES.map((s) => {
                  const t = totals(groups[s.id]);
                  return (
                    <tr key={s.id} className="crm-row">
                      <td className="col-name"><strong>{s.label}</strong></td>
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
      ) : (
        <div className="crm-card pl-note-card">
          <TrendingUp size={24} aria-hidden="true" />
          <h3>Aún no hay datos de pronóstico</h3>
          <p className="crm-hint">Crea oportunidades con fecha de cierre estimada y verás aquí lo que esperas cerrar.</p>
        </div>
      )}
    </>
  );
}
