/**
 * Lógica pura de la «vista guardada» del Generador de imágenes: búsqueda por
 * nombre (sin distinguir tildes ni mayúsculas), filtro por estado, orden y
 * conteos. Sin dependencias de React ni del navegador, para poder probarla.
 */

export type GridStatus = 'draft' | 'in_progress' | 'completed';
export type StatusFilter = 'all' | GridStatus;
export type GridSort = 'recent' | 'name';

/** Campos mínimos que necesita la lógica; `ContentGridSummary` los cumple. */
export interface FilterableGrid {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
}

export interface GridView {
  query: string;
  status: StatusFilter;
  sort: GridSort;
}

export const DEFAULT_GRID_VIEW: GridView = { query: '', status: 'all', sort: 'recent' };

const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'draft', 'in_progress', 'completed'];
const SORTS: readonly GridSort[] = ['recent', 'name'];
const MAX_QUERY_LENGTH = 80;

/** Minúsculas, sin tildes ni diacríticos y con espacios colapsados. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Un estado desconocido se trata como «sin iniciar» (igual que la tarjeta). */
export function normalizeStatus(status: string): GridStatus {
  return status === 'in_progress' || status === 'completed' ? status : 'draft';
}

export function hasActiveFilters(view: GridView): boolean {
  return normalizeText(view.query) !== '' || view.status !== 'all';
}

/** Filtra por nombre (todas las palabras deben aparecer) y por estado. No muta la entrada. */
export function filterGrids<T extends FilterableGrid>(
  grids: readonly T[],
  { query, status }: Pick<GridView, 'query' | 'status'>,
): T[] {
  const tokens = normalizeText(query).split(' ').filter(Boolean);
  return grids.filter((grid) => {
    if (status !== 'all' && normalizeStatus(grid.status) !== status) return false;
    if (tokens.length === 0) return true;
    const name = normalizeText(grid.name);
    return tokens.every((token) => name.includes(token));
  });
}

function timeOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Ordena sin mutar la entrada. Es estable: ante empates conserva el orden original. */
export function sortGrids<T extends FilterableGrid>(grids: readonly T[], sort: GridSort): T[] {
  const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
  return grids
    .map((grid, index) => ({ grid, index }))
    .sort((a, b) => {
      const byKey =
        sort === 'name'
          ? collator.compare(a.grid.name, b.grid.name)
          : timeOf(b.grid.updatedAt) - timeOf(a.grid.updatedAt);
      return byKey !== 0 ? byKey : a.index - b.index;
    })
    .map(({ grid }) => grid);
}

/** Conteo por estado; `all` es el total. */
export function countByStatus(grids: readonly FilterableGrid[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { all: grids.length, draft: 0, in_progress: 0, completed: 0 };
  for (const grid of grids) counts[normalizeStatus(grid.status)] += 1;
  return counts;
}

/** Firma de la lista (ids + updatedAt) para detectar cambios entre cargas. */
export function gridsSignature(grids: readonly FilterableGrid[]): string {
  return grids.map((g) => `${g.id}:${g.updatedAt}`).join('|');
}

/** Lee la vista guardada; cualquier dato ausente o corrupto cae en el valor por defecto. */
export function parseGridView(raw: string | null): GridView {
  if (!raw) return DEFAULT_GRID_VIEW;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return DEFAULT_GRID_VIEW;
    const { query, status, sort } = data as Record<string, unknown>;
    return {
      query: typeof query === 'string' ? query.slice(0, MAX_QUERY_LENGTH) : DEFAULT_GRID_VIEW.query,
      status: STATUS_FILTERS.find((s) => s === status) ?? DEFAULT_GRID_VIEW.status,
      sort: SORTS.find((s) => s === sort) ?? DEFAULT_GRID_VIEW.sort,
    };
  } catch {
    return DEFAULT_GRID_VIEW;
  }
}
