import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RUN_FILTERS,
  countByStatus,
  filterRuns,
  groupByDay,
  hasActiveFilters,
  mergeRuns,
  relativeTime,
} from '../automation-runs';

const NOW = new Date(2026, 9, 16, 12, 0, 0);
const at = (daysAgo: number, hour = 9) => new Date(2026, 9, 16 - daysAgo, hour, 0, 0).toISOString();

const runs = [
  { id: 'a', workflowId: 'w1', status: 'success', createdAt: at(0, 11) },
  { id: 'b', workflowId: 'w2', status: 'error', createdAt: at(0, 8) },
  { id: 'c', workflowId: 'w1', status: 'skipped', createdAt: at(1) },
  { id: 'd', workflowId: 'w1', status: 'success', createdAt: at(10) },
];

describe('filterRuns', () => {
  it('sin filtros devuelve todo', () => {
    expect(filterRuns(runs, DEFAULT_RUN_FILTERS, NOW)).toHaveLength(4);
  });

  it('filtra por estado y flujo', () => {
    expect(filterRuns(runs, { ...DEFAULT_RUN_FILTERS, status: 'success' }, NOW).map((r) => r.id)).toEqual(['a', 'd']);
    expect(filterRuns(runs, { ...DEFAULT_RUN_FILTERS, workflowId: 'w2' }, NOW).map((r) => r.id)).toEqual(['b']);
  });

  it('filtra por rango de fecha', () => {
    expect(filterRuns(runs, { ...DEFAULT_RUN_FILTERS, range: 'hoy' }, NOW).map((r) => r.id)).toEqual(['a', 'b']);
    expect(filterRuns(runs, { ...DEFAULT_RUN_FILTERS, range: '7d' }, NOW)).toHaveLength(3);
    expect(filterRuns(runs, { ...DEFAULT_RUN_FILTERS, range: '30d' }, NOW)).toHaveLength(4);
  });
});

describe('hasActiveFilters', () => {
  it('detecta filtros activos', () => {
    expect(hasActiveFilters(DEFAULT_RUN_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_RUN_FILTERS, range: 'hoy' })).toBe(true);
  });
});

describe('countByStatus', () => {
  it('cuenta por estado e ignora estados desconocidos', () => {
    const counts = countByStatus([...runs, { id: 'x', workflowId: 'w', status: 'raro', createdAt: at(0) }]);
    expect(counts).toEqual({ todos: 5, success: 2, error: 1, skipped: 1, pending: 0 });
  });
});

describe('mergeRuns', () => {
  it('no duplica ejecuciones y conserva el orden', () => {
    const merged = mergeRuns(runs.slice(0, 2), [runs[1], runs[2]]);
    expect(merged.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('relativeTime', () => {
  it('formatea tramos', () => {
    expect(relativeTime(null, NOW)).toBe('—');
    expect(relativeTime(new Date(NOW.getTime() - 10_000).toISOString(), NOW)).toBe('hace un momento');
    expect(relativeTime(new Date(NOW.getTime() - 5 * 60_000).toISOString(), NOW)).toBe('hace 5 min');
    expect(relativeTime(new Date(NOW.getTime() - 3 * 3_600_000).toISOString(), NOW)).toBe('hace 3 h');
    expect(relativeTime(at(1, 12), NOW)).toBe('hace 1 día');
    expect(relativeTime(at(3, 12), NOW)).toBe('hace 3 días');
  });
});

describe('groupByDay', () => {
  it('agrupa por día natural con etiquetas Hoy y Ayer', () => {
    const groups = groupByDay(runs, NOW);
    expect(groups.map((g) => g.label).slice(0, 2)).toEqual(['Hoy', 'Ayer']);
    expect(groups[0].runs.map((r) => r.id)).toEqual(['a', 'b']);
    expect(groups).toHaveLength(3);
  });
});
