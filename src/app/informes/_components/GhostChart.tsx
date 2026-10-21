import React from 'react';
import {
  areaPath,
  barRects,
  donutSegments,
  ILLUSTRATIVE_BARS,
  ILLUSTRATIVE_DONUT,
  ILLUSTRATIVE_LINE,
  linePoints,
  pathFromPoints,
} from './ghost-geometry';
import type { GhostKind } from './report-tabs';

const W = 320;
const H = 140;
const R = 46;
const RING_COLORS = ['var(--rai-gold)', 'var(--rai-purple)', 'var(--rai-success)'] as const;

function Grid() {
  return (
    <g stroke="var(--rai-border)" strokeWidth="1" strokeDasharray="3 5" opacity="0.7">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} />
      ))}
    </g>
  );
}

function Line() {
  const pts = linePoints(ILLUSTRATIVE_LINE, W, H);
  return (
    <>
      <Grid />
      <path d={areaPath(pts, H)} fill="var(--rai-gold)" opacity="0.1" />
      <path d={pathFromPoints(pts)} fill="none" stroke="var(--rai-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      {pts.map((p) => (
        <circle key={p.x} cx={p.x} cy={p.y} r="3" fill="var(--rai-card)" stroke="var(--rai-gold)" strokeWidth="2" />
      ))}
    </>
  );
}

function Bars() {
  return (
    <>
      <Grid />
      {barRects(ILLUSTRATIVE_BARS, W, H).map((b) => (
        <rect key={b.x} x={b.x} y={b.y} width={b.w} height={b.h} rx="4" fill="var(--rai-gold)" opacity="0.55" />
      ))}
    </>
  );
}

function Donut() {
  const segs = donutSegments(ILLUSTRATIVE_DONUT, R, 5);
  return (
    <g transform={`translate(${W / 2} ${H / 2}) rotate(-90)`}>
      <circle r={R} fill="none" stroke="var(--rai-border)" strokeWidth="16" opacity="0.4" />
      {segs.map((s, i) => (
        <circle
          key={i}
          r={R}
          fill="none"
          stroke={RING_COLORS[i % RING_COLORS.length]}
          strokeWidth="16"
          strokeDasharray={`${s.dash} ${s.rest}`}
          strokeDashoffset={s.offset}
          opacity="0.65"
        />
      ))}
    </g>
  );
}

interface GhostChartProps {
  kind: GhostKind;
  title: string;
  text: string;
}

const KIND_LABEL: Record<GhostKind, string> = { line: 'de líneas', bars: 'de barras', donut: 'circular' };

/** Gráfico fantasma rotulado «Ejemplo ilustrativo»: forma decorativa, sin cifras ni datos de la cuenta. */
export function GhostChart({ kind, title, text }: GhostChartProps) {
  return (
    <section className="card rp-ghost" aria-label={title}>
      <header className="rp-ghost-head">
        <h3>{title}</h3>
        <span className="badge badge-muted">Ejemplo ilustrativo</span>
      </header>
      <svg className="rp-ghost-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ejemplo ilustrativo de gráfico ${KIND_LABEL[kind]}, sin datos reales`} preserveAspectRatio="xMidYMid meet">
        {kind === 'line' && <Line />}
        {kind === 'bars' && <Bars />}
        {kind === 'donut' && <Donut />}
      </svg>
      <p className="rp-ghost-text">{text}</p>
      <p className="rp-ghost-soon">Disponible en próximas iteraciones. La forma del gráfico no representa datos de tu cuenta.</p>
    </section>
  );
}
