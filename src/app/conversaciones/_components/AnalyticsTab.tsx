import React from 'react';
import { Info } from 'lucide-react';
import { TabFrame } from './TabFrame';
import type { InboxSummary } from '../_lib/conv-model';

/** Indicadores calculados con los contactos ya cargados. */
export function AnalyticsTab({ summary, loading }: { summary: InboxSummary; loading: boolean }) {
  const tiles: Array<[string, string]> = [
    ['Contactos totales', String(summary.total)],
    ['Conversaciones abiertas', String(summary.open)],
    ['Pendientes', String(summary.pending)],
    ['Conversaciones resueltas', String(summary.closed)],
    ['Mensajes sin leer', String(summary.unread)],
    ['Tiempo medio de respuesta', '—'],
    ['CSAT', '—'],
  ];
  return (
    <TabFrame intro="Tiempos de respuesta, volumen de mensajes y satisfacción del cliente.">
      <dl className="cv-tiles" aria-busy={loading}>
        {tiles.map(([label, value]) => (
          <div key={label} className="card cv-tile">
            <dt>{label}</dt>
            <dd>{loading ? <span className="fx-shimmer cv-sk-line cv-sk-value" aria-hidden="true" /> : value}</dd>
          </div>
        ))}
      </dl>
      <p className="cv-note"><Info size={12} aria-hidden="true" /> Métricas de tiempo de respuesta y CSAT pendientes de instrumentación.</p>
    </TabFrame>
  );
}
