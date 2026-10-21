import { describe, expect, it } from 'vitest';
import { centerScrollLeft, indicatorTransform, nextTabIndex, panelDomId, scrollEdges, tabDomId } from './tabs-nav';

describe('nextTabIndex', () => {
  it('avanza y retrocede de forma circular', () => {
    expect(nextTabIndex('ArrowRight', 0, 4)).toBe(1);
    expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0);
    expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3);
    expect(nextTabIndex('ArrowLeft', 2, 4)).toBe(1);
  });
  it('salta al inicio y al final', () => {
    expect(nextTabIndex('Home', 2, 4)).toBe(0);
    expect(nextTabIndex('End', 0, 4)).toBe(3);
  });
  it('ignora otras teclas y listas vacías', () => {
    expect(nextTabIndex('Enter', 0, 4)).toBeNull();
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
  });
});

describe('indicatorTransform', () => {
  it('compone translateX y scaleX', () => {
    expect(indicatorTransform({ x: 120.456, w: 88 })).toBe('translateX(120.46px) scaleX(88)');
  });
  it('sanea valores no finitos o negativos', () => {
    expect(indicatorTransform({ x: Number.NaN, w: -5 })).toBe('translateX(0px) scaleX(0)');
  });
});

describe('centerScrollLeft', () => {
  it('centra la pestaña dentro del recorrido disponible', () => {
    expect(centerScrollLeft(500, 100, 300, 1200)).toBe(400);
  });
  it('acota al inicio y al final', () => {
    expect(centerScrollLeft(0, 100, 300, 1200)).toBe(0);
    expect(centerScrollLeft(1100, 100, 300, 1200)).toBe(900);
    expect(centerScrollLeft(10, 10, 500, 400)).toBe(0);
  });
});

describe('scrollEdges', () => {
  it('detecta contenido oculto a cada lado', () => {
    expect(scrollEdges(0, 300, 900)).toEqual({ start: false, end: true });
    expect(scrollEdges(300, 300, 900)).toEqual({ start: true, end: true });
    expect(scrollEdges(600, 300, 900)).toEqual({ start: true, end: false });
    expect(scrollEdges(0, 300, 300)).toEqual({ start: false, end: false });
  });
});

describe('ids ARIA', () => {
  it('genera ids estables', () => {
    expect(tabDomId('bl', 'orders')).toBe('bl-tab-orders');
    expect(panelDomId('bl')).toBe('bl-panel');
  });
});
