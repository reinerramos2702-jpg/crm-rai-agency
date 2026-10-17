// Geometría PURA de los gráficos fantasma (SVG inline, sin librerías).
// Las series son formas ilustrativas fijas: no representan datos de la cuenta.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}

export const ILLUSTRATIVE_LINE: readonly number[] = [0.32, 0.45, 0.4, 0.58, 0.52, 0.7, 0.66, 0.84];
export const ILLUSTRATIVE_BARS: readonly number[] = [0.35, 0.55, 0.42, 0.7, 0.5, 0.82, 0.62];
export const ILLUSTRATIVE_DONUT: readonly number[] = [0.45, 0.3, 0.25];

/** Barras con base en `h`; cada valor (0–1) se escala a la altura útil. */
export function barRects(values: readonly number[], w: number, h: number, gap = 10): Rect[] {
  const n = values.length;
  if (n === 0 || w <= 0 || h <= 0) return [];
  const bw = Math.max(1, (w - gap * (n - 1)) / n);
  return values.map((v, i) => {
    const bh = Math.max(2, Math.min(1, Math.max(0, v)) * h);
    return { x: round(i * (bw + gap)), y: round(h - bh), w: round(bw), h: round(bh) };
  });
}

/** Puntos de una línea que ocupa todo el ancho; y crece hacia arriba. */
export function linePoints(values: readonly number[], w: number, h: number, pad = 6): Point[] {
  const n = values.length;
  if (n === 0) return [];
  const inner = Math.max(0, h - pad * 2);
  return values.map((v, i) => ({
    x: round(n === 1 ? w / 2 : (i * w) / (n - 1)),
    y: round(pad + inner * (1 - Math.min(1, Math.max(0, v)))),
  }));
}

export function pathFromPoints(points: readonly Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
}

/** Área bajo la línea, cerrada contra la base `h`. */
export function areaPath(points: readonly Point[], h: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${pathFromPoints(points)} L${last.x} ${h} L${first.x} ${h} Z`;
}

export interface DonutSegment {
  /** Longitud del arco visible. */
  dash: number;
  /** Longitud restante de la circunferencia. */
  rest: number;
  /** stroke-dashoffset (negativo = avanza en sentido horario). */
  offset: number;
}

/** Segmentos de un anillo con `stroke-dasharray`; las proporciones se normalizan a 1. */
export function donutSegments(values: readonly number[], radius: number, gap = 4): DonutSegment[] {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  if (total <= 0 || radius <= 0) return [];
  const c = 2 * Math.PI * radius;
  let start = 0;
  return values.map((v) => {
    const len = (Math.max(0, v) / total) * c;
    const dash = Math.max(0, len - gap);
    const seg = { dash: round(dash), rest: round(c - dash), offset: start === 0 ? 0 : round(-start) };
    start += len;
    return seg;
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
