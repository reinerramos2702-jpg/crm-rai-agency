import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRID_VIEW,
  countByStatus,
  filterGrids,
  gridsSignature,
  hasActiveFilters,
  normalizeStatus,
  normalizeText,
  parseGridView,
  sortGrids,
  type FilterableGrid,
} from '../grid-filters';

const g = (id: string, name: string, status: string, updatedAt: string): FilterableGrid => ({
  id,
  name,
  status,
  updatedAt,
});

const GRIDS: FilterableGrid[] = [
  g('1', 'Semana Navideña', 'draft', '2026-10-01T10:00:00Z'),
  g('2', 'Lanzamiento café', 'in_progress', '2026-10-05T10:00:00Z'),
  g('3', 'Promo Año Nuevo', 'completed', '2026-09-20T10:00:00Z'),
  g('4', 'Ñandú y más', 'completed', '2026-10-05T10:00:00Z'),
];

describe('normalizeText', () => {
  it('quita tildes, mayúsculas y espacios sobrantes', () => {
    expect(normalizeText('  CAFÉ   Ñandú ')).toBe('cafe nandu');
  });

  it('devuelve cadena vacía para texto vacío', () => {
    expect(normalizeText('   ')).toBe('');
  });
});

describe('normalizeStatus', () => {
  it('trata un estado desconocido como sin iniciar', () => {
    expect(normalizeStatus('algo-raro')).toBe('draft');
    expect(normalizeStatus('in_progress')).toBe('in_progress');
    expect(normalizeStatus('completed')).toBe('completed');
  });
});

describe('filterGrids', () => {
  it('devuelve todo sin búsqueda ni estado y no muta la entrada', () => {
    const copy = [...GRIDS];
    expect(filterGrids(GRIDS, { query: '', status: 'all' })).toEqual(GRIDS);
    expect(GRIDS).toEqual(copy);
  });

  it('busca ignorando tildes y mayúsculas, en ambos sentidos', () => {
    expect(filterGrids(GRIDS, { query: 'navidena', status: 'all' }).map((x) => x.id)).toEqual(['1']);
    expect(filterGrids(GRIDS, { query: 'CAFÉ', status: 'all' }).map((x) => x.id)).toEqual(['2']);
    expect(filterGrids(GRIDS, { query: 'nandu', status: 'all' }).map((x) => x.id)).toEqual(['4']);
    expect(filterGrids(GRIDS, { query: 'ano', status: 'all' }).map((x) => x.id)).toEqual(['3']);
  });

  it('exige todas las palabras de la búsqueda', () => {
    expect(filterGrids(GRIDS, { query: 'promo nuevo', status: 'all' }).map((x) => x.id)).toEqual(['3']);
    expect(filterGrids(GRIDS, { query: 'promo cafe', status: 'all' })).toEqual([]);
  });

  it('filtra por estado y combina con la búsqueda', () => {
    expect(filterGrids(GRIDS, { query: '', status: 'completed' }).map((x) => x.id)).toEqual(['3', '4']);
    expect(filterGrids(GRIDS, { query: 'nandu', status: 'completed' }).map((x) => x.id)).toEqual(['4']);
    expect(filterGrids(GRIDS, { query: 'nandu', status: 'draft' })).toEqual([]);
  });

  it('devuelve una lista vacía cuando la entrada está vacía', () => {
    expect(filterGrids([], { query: 'x', status: 'draft' })).toEqual([]);
  });
});

describe('sortGrids', () => {
  it('ordena por recientes y conserva el orden original en empates', () => {
    expect(sortGrids(GRIDS, 'recent').map((x) => x.id)).toEqual(['2', '4', '1', '3']);
  });

  it('ordena por nombre sin tener en cuenta tildes', () => {
    expect(sortGrids(GRIDS, 'name').map((x) => x.name)).toEqual([
      'Lanzamiento café',
      'Ñandú y más',
      'Promo Año Nuevo',
      'Semana Navideña',
    ]);
  });

  it('es estable con nombres iguales y no muta la entrada', () => {
    const same = [g('a', 'Igual', 'draft', '2026-01-01'), g('b', 'igual', 'draft', '2026-01-01'), g('c', 'Igual', 'draft', '2026-01-01')];
    const copy = [...same];
    expect(sortGrids(same, 'name').map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(sortGrids(same, 'recent').map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(same).toEqual(copy);
  });

  it('manda al final las fechas inválidas y acepta listas vacías', () => {
    const list = [g('x', 'A', 'draft', 'no-fecha'), g('y', 'B', 'draft', '2026-01-01')];
    expect(sortGrids(list, 'recent').map((i) => i.id)).toEqual(['y', 'x']);
    expect(sortGrids([], 'name')).toEqual([]);
  });
});

describe('countByStatus', () => {
  it('cuenta por estado y el total', () => {
    expect(countByStatus(GRIDS)).toEqual({ all: 4, draft: 1, in_progress: 1, completed: 2 });
  });

  it('cuenta los estados desconocidos como sin iniciar y soporta lista vacía', () => {
    expect(countByStatus([g('z', 'Z', 'rara', '2026-01-01')])).toEqual({ all: 1, draft: 1, in_progress: 0, completed: 0 });
    expect(countByStatus([])).toEqual({ all: 0, draft: 0, in_progress: 0, completed: 0 });
  });
});

describe('gridsSignature y hasActiveFilters', () => {
  it('cambia cuando cambia un updatedAt o la lista', () => {
    const base = gridsSignature(GRIDS);
    expect(gridsSignature([...GRIDS])).toBe(base);
    expect(gridsSignature([{ ...GRIDS[0], updatedAt: '2026-10-09T00:00:00Z' }, ...GRIDS.slice(1)])).not.toBe(base);
    expect(gridsSignature(GRIDS.slice(1))).not.toBe(base);
    expect(gridsSignature([])).toBe('');
  });

  it('detecta filtros activos', () => {
    expect(hasActiveFilters(DEFAULT_GRID_VIEW)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_GRID_VIEW, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_GRID_VIEW, query: 'a' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_GRID_VIEW, status: 'draft' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_GRID_VIEW, sort: 'name' })).toBe(false);
  });
});

describe('parseGridView', () => {
  it('cae en el valor por defecto con datos ausentes o corruptos', () => {
    expect(parseGridView(null)).toEqual(DEFAULT_GRID_VIEW);
    expect(parseGridView('')).toEqual(DEFAULT_GRID_VIEW);
    expect(parseGridView('{no es json')).toEqual(DEFAULT_GRID_VIEW);
    expect(parseGridView('42')).toEqual(DEFAULT_GRID_VIEW);
    expect(parseGridView('null')).toEqual(DEFAULT_GRID_VIEW);
  });

  it('acepta una vista válida y descarta campos inválidos', () => {
    expect(parseGridView(JSON.stringify({ query: 'café', status: 'completed', sort: 'name' }))).toEqual({
      query: 'café',
      status: 'completed',
      sort: 'name',
    });
    expect(parseGridView(JSON.stringify({ query: 5, status: 'otro', sort: 'raro' }))).toEqual(DEFAULT_GRID_VIEW);
  });

  it('recorta búsquedas excesivamente largas', () => {
    expect(parseGridView(JSON.stringify({ query: 'a'.repeat(500) })).query).toHaveLength(80);
  });
});
