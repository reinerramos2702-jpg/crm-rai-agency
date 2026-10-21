import React from 'react';
import { summarizeCounts } from '@/lib/automation-runs';
import '../activity.css';

/** Resumen del periodo: totales por estado sobre todo el historial filtrado, no solo lo cargado. */
export function ActivitySummary({ summary }: { summary: Record<string, number> | undefined }) {
  if (!summary) return null;
  const s = summarizeCounts(summary);
  const tiles = [
    { label: 'Ejecuciones', value: s.total, tone: '' },
    { label: 'Correctas', value: s.success, tone: 'ok' },
    { label: 'Con error', value: s.error, tone: s.error > 0 ? 'danger' : '' },
    { label: 'Omitidas', value: s.skipped, tone: '' },
    { label: 'Tasa de éxito', value: s.successRate === null ? '—' : `${s.successRate}%`, tone: s.successRate !== null && s.successRate < 80 ? 'danger' : 'gold' },
  ];
  return (
    <dl className="ac-summary" aria-label="Resumen del periodo">
      {tiles.map((t) => (
        <div key={t.label} className={`ac-tile${t.tone ? ` ac-tile--${t.tone}` : ''}`}>
          <dd>{t.value}</dd>
          <dt>{t.label}</dt>
        </div>
      ))}
    </dl>
  );
}
