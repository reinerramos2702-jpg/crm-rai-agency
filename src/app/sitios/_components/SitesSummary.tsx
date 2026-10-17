import React from 'react';
import { BedDouble, CalendarCheck, Globe, Power } from 'lucide-react';
import { pluralize, type SitesSummary as Summary } from './site-model';

function Tile({ icon: Icon, label, value, sub, tone }: {
  icon: typeof Globe; label: string; value: number; sub: React.ReactNode; tone?: 'ok';
}) {
  return (
    <div className="card st-tile" data-tone={tone}>
      <span className="st-tile-icon" aria-hidden="true"><Icon size={16} /></span>
      <div className="st-tile-body">
        <span className="st-tile-label">{label}</span>
        <span className="st-tile-value">{value}</span>
        <span className="st-tile-sub">{sub}</span>
      </div>
    </div>
  );
}

/** Resumen sobre TODOS los sitios (no cambia al filtrar, para que las cifras no salten). */
export function SitesSummary({ summary }: { summary: Summary }) {
  const rest = summary.maintenance + summary.closed;
  const restText = rest === 0
    ? 'Todos operativos'
    : [
        summary.maintenance ? `${summary.maintenance} en mantenimiento` : '',
        summary.closed ? `${summary.closed} ${pluralize(summary.closed, 'cerrado', 'cerrados')}` : '',
      ].filter(Boolean).join(' · ');
  return (
    <div className="st-cq">
    <section className="st-summary" aria-label="Resumen de sitios">
      <Tile icon={Globe} label="Sitios" value={summary.total} sub={`${summary.total === 1 ? 'locación registrada' : 'locaciones registradas'}`} />
      <Tile icon={Power} label="Activos" value={summary.active} sub={restText} tone="ok" />
      <Tile icon={BedDouble} label="Habitaciones" value={summary.rooms} sub="inventario total" />
      <Tile icon={CalendarCheck} label="Reservas" value={summary.bookings} sub="histórico acumulado" />
    </section>
    </div>
  );
}
