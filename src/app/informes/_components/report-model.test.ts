import { describe, expect, it } from 'vitest';
import type { DashboardKpi } from '@/lib/dashboard-summary';
import { allEmpty, buildKpiCards, deltaAria, formatCount, periodText, timeText } from './report-model';
import { REPORT_TABS, reportTabById } from './report-tabs';
import { areaPath, barRects, donutSegments, linePoints, pathFromPoints } from './ghost-geometry';

const kpis: DashboardKpi[] = [
  { id: 'contacts', current: 12, previous: 10 },
  { id: 'campaigns', current: 0, previous: 0 },
];

describe('buildKpiCards', () => {
  it('respeta el orden pedido y calcula la variación', () => {
    const cards = buildKpiCards(kpis, ['campaigns', 'contacts']);
    expect(cards.map((c) => c.id)).toEqual(['campaigns', 'contacts']);
    expect(cards[1].delta).toEqual({ dir: 'up', label: '+20 %' });
    expect(cards[1].status).toBe('value');
  });
  it('marca como vacío el indicador sin actividad en ambos periodos', () => {
    expect(buildKpiCards(kpis, ['campaigns'])[0].empty).toBe(true);
  });
  it('marca como restringido el indicador que el servidor omite', () => {
    const [c] = buildKpiCards(kpis, ['payments']);
    expect(c.status).toBe('restricted');
    expect(c.empty).toBe(false);
  });
  it('tolera la ausencia total de datos', () => {
    expect(buildKpiCards(undefined, ['posts'])[0].status).toBe('restricted');
  });
});

describe('allEmpty', () => {
  it('es true solo si hay datos y todos están sin actividad', () => {
    expect(allEmpty(buildKpiCards(kpis, ['campaigns']))).toBe(true);
    expect(allEmpty(buildKpiCards(kpis, ['campaigns', 'contacts']))).toBe(false);
    expect(allEmpty(buildKpiCards(kpis, ['payments']))).toBe(false);
  });
});

describe('textos', () => {
  it('formatea cifras y periodos en español', () => {
    expect(formatCount(1234)).toMatch(/1\D?234/);
    expect(formatCount(Number.NaN)).toBe('0');
    expect(periodText(7)).toBe('últimos 7 días');
  });
  it('describe la variación para lectores de pantalla', () => {
    expect(deltaAria({ dir: 'up', label: '+20 %' }, 7)).toBe('+20 % frente a los 7 días anteriores');
    expect(deltaAria({ dir: 'none', label: 'Sin datos' }, 7)).toBe('Sin datos para comparar');
    expect(deltaAria({ dir: 'new', label: 'Nuevo' }, 30)).toContain('30 días anteriores');
  });
  it('devuelve null con horas inválidas', () => {
    expect(timeText(undefined)).toBeNull();
    expect(timeText('x')).toBeNull();
    expect(timeText('2026-10-17T12:30:00Z')).toMatch(/\d/);
  });
});

describe('pestañas', () => {
  it('declara 4 pestañas y vuelve a Resumen si el id no existe', () => {
    expect(REPORT_TABS.map((t) => t.id)).toEqual(['overview', 'ventas', 'campanas', 'fuentes']);
    expect(reportTabById('nada').id).toBe('overview');
  });
});

describe('geometría de gráficos fantasma', () => {
  it('barRects reparte el ancho y mantiene las barras dentro del lienzo', () => {
    const bars = barRects([0.5, 1, 2, -1], 100, 50, 10);
    expect(bars).toHaveLength(4);
    for (const b of bars) {
      expect(b.y + b.h).toBeCloseTo(50);
      expect(b.h).toBeGreaterThanOrEqual(2);
      expect(b.h).toBeLessThanOrEqual(50);
    }
    expect(bars[3].x + bars[3].w).toBeCloseTo(100);
  });
  it('barRects y linePoints devuelven vacío sin valores', () => {
    expect(barRects([], 100, 50)).toEqual([]);
    expect(linePoints([], 100, 50)).toEqual([]);
  });
  it('linePoints cubre todo el ancho y respeta el relleno vertical', () => {
    const pts = linePoints([0, 1], 200, 100, 10);
    expect(pts[0]).toEqual({ x: 0, y: 90 });
    expect(pts[1]).toEqual({ x: 200, y: 10 });
  });
  it('pathFromPoints y areaPath generan trazos válidos', () => {
    const pts = linePoints([0.2, 0.8], 100, 40, 4);
    expect(pathFromPoints(pts).startsWith('M0 ')).toBe(true);
    expect(areaPath(pts, 40).endsWith('Z')).toBe(true);
    expect(areaPath([], 40)).toBe('');
  });
  it('donutSegments suma la circunferencia completa', () => {
    const segs = donutSegments([2, 1, 1], 40, 0);
    const c = 2 * Math.PI * 40;
    expect(segs.reduce((s, x) => s + x.dash, 0)).toBeCloseTo(c, 0);
    expect(segs[0].offset).toBe(0);
    expect(segs[1].offset).toBeLessThan(0);
    expect(donutSegments([0, 0], 40)).toEqual([]);
  });
});
