import React from 'react';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

/** Mini gráfico de línea en SVG puro (sin dependencias externas). */
export function LineChart({ data }: { data: { date: string; contacts: number }[] }) {
  const W = 100;
  const H = 32;
  const max = Math.max(1, ...data.map((d) => d.contacts));
  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * W : 0;
    return `${x},${H - (d.contacts / max) * H}`;
  });
  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div className="ag-chart" role="img" aria-label="Contactos únicos atendidos por día">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="ag-lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--rai-gold)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--rai-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#ag-lc-fill)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--rai-gold)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="row-between muted" style={{ fontSize: 11, marginTop: 4 }}>
        <span>{first ? shortDate(first.date) : ''}</span>
        <span>{last ? shortDate(last.date) : ''}</span>
      </div>
    </div>
  );
}
