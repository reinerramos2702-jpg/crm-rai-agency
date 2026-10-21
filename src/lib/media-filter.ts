/**
 * Búsqueda, filtros, orden y conteos de la biblioteca multimedia.
 * Lógica pura (sin React ni navegador). El texto se compara sin tildes ni
 * mayúsculas, y todas las palabras de la búsqueda deben aparecer.
 */
import { normalizeText } from './grid-filters';
import {
  MEDIA_KINDS,
  MEDIA_ORIGINS,
  ORIGIN_LABELS,
  type MediaItem,
  type MediaKind,
  type MediaOrigin,
} from './media-types';

export type MediaOriginFilter = 'all' | MediaOrigin;
export type MediaRange = 'all' | '7d' | '30d' | '90d';
export type MediaSort = 'recent' | 'oldest' | 'name';

export interface MediaView {
  tab: MediaKind;
  query: string;
  origin: MediaOriginFilter;
  range: MediaRange;
  sort: MediaSort;
  /** Etiqueta local; vacía = todas. */
  tag: string;
}

export const DEFAULT_MEDIA_VIEW: MediaView = {
  tab: 'image',
  query: '',
  origin: 'all',
  range: 'all',
  sort: 'recent',
  tag: '',
};

export const RANGES: ReadonlyArray<{ value: MediaRange; label: string; days: number }> = [
  { value: 'all', label: 'Todo', days: 0 },
  { value: '7d', label: '7 días', days: 7 },
  { value: '30d', label: '30 días', days: 30 },
  { value: '90d', label: '90 días', days: 90 },
];

export const SORTS: ReadonlyArray<{ value: MediaSort; label: string }> = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'name', label: 'Nombre (A-Z)' },
];

const MAX_QUERY_LENGTH = 80;
const MAX_TAG_LENGTH = 24;
const DAY_MS = 86_400_000;

export type TagMap = Readonly<Record<string, readonly string[]>>;

/** Filtros que reducen la lista (la pestaña no cuenta: es la vista, no un filtro). */
export function hasActiveFilters(view: MediaView): boolean {
  return normalizeText(view.query) !== '' || view.origin !== 'all' || view.range !== 'all' || view.tag !== '';
}

export function activeFilterCount(view: MediaView): number {
  return (view.origin !== 'all' ? 1 : 0) + (view.range !== 'all' ? 1 : 0) + (view.tag !== '' ? 1 : 0);
}

function rangeDays(range: MediaRange): number {
  return RANGES.find((r) => r.value === range)?.days ?? 0;
}

function searchText(item: MediaItem, tags: readonly string[]): string {
  return normalizeText(
    [item.title, item.detail, item.note, ORIGIN_LABELS[item.origin], item.ext, ...tags].join(' '),
  );
}

type Facet = 'tab' | 'origin';

function matches(item: MediaItem, view: MediaView, tagMap: TagMap, now: number, skip?: Facet): boolean {
  if (skip !== 'tab' && item.kind !== view.tab) return false;
  if (skip !== 'origin' && view.origin !== 'all' && item.origin !== view.origin) return false;
  const itemTags = tagMap[item.id] ?? [];
  if (view.tag !== '' && !itemTags.some((t) => t.toLowerCase() === view.tag.toLowerCase())) return false;
  const days = rangeDays(view.range);
  if (days > 0 && Date.parse(item.date) < now - days * DAY_MS) return false;
  const tokens = normalizeText(view.query).split(' ').filter(Boolean);
  if (tokens.length > 0) {
    const haystack = searchText(item, itemTags);
    if (!tokens.every((token) => haystack.includes(token))) return false;
  }
  return true;
}

export function sortMedia<T extends MediaItem>(items: readonly T[], sort: MediaSort): T[] {
  const copy = [...items];
  if (sort === 'name') {
    return copy.sort((a, b) => a.title.localeCompare(b.title, 'es', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id));
  }
  const dir = sort === 'oldest' ? 1 : -1;
  return copy.sort((a, b) => dir * (Date.parse(a.date) - Date.parse(b.date)) || a.id.localeCompare(b.id));
}

/** Lista visible: pestaña + búsqueda + origen + fecha + etiqueta, ya ordenada. No muta la entrada. */
export function filterMedia(items: readonly MediaItem[], view: MediaView, tagMap: TagMap = {}, now = Date.now()): MediaItem[] {
  return sortMedia(
    items.filter((item) => matches(item, view, tagMap, now)),
    view.sort,
  );
}

/** Conteo por pestaña con los demás filtros aplicados (coincide con lo que se vería al pulsar). */
export function countByKind(items: readonly MediaItem[], view: MediaView, tagMap: TagMap = {}, now = Date.now()): Record<MediaKind, number> {
  const counts = { image: 0, video: 0, audio: 0, document: 0 } as Record<MediaKind, number>;
  for (const item of items) {
    if (matches(item, view, tagMap, now, 'tab')) counts[item.kind] += 1;
  }
  return counts;
}

/** Conteo por origen dentro de la pestaña actual, sin aplicar el filtro de origen. */
export function countByOrigin(
  items: readonly MediaItem[],
  view: MediaView,
  tagMap: TagMap = {},
  now = Date.now(),
): Record<MediaOriginFilter, number> {
  const counts = { all: 0, generator: 0, campaign: 0, planner: 0, brand: 0, reference: 0 } as Record<MediaOriginFilter, number>;
  for (const item of items) {
    if (!matches(item, view, tagMap, now, 'origin')) continue;
    counts.all += 1;
    counts[item.origin] += 1;
  }
  return counts;
}

/** Lee la vista guardada; cualquier valor inválido vuelve a su valor por defecto. */
export function parseMediaView(raw: string | null | undefined): MediaView {
  if (!raw) return DEFAULT_MEDIA_VIEW;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_MEDIA_VIEW;
  }
  if (!data || typeof data !== 'object') return DEFAULT_MEDIA_VIEW;
  return sanitizeMediaView(data as Record<string, unknown>);
}

export function sanitizeMediaView(d: Record<string, unknown>): MediaView {
  const tab = MEDIA_KINDS.find((k) => k === d.tab) ?? DEFAULT_MEDIA_VIEW.tab;
  const origin = d.origin === 'all' ? 'all' : MEDIA_ORIGINS.find((o) => o === d.origin) ?? 'all';
  const range = RANGES.find((r) => r.value === d.range)?.value ?? 'all';
  const sort = SORTS.find((s) => s.value === d.sort)?.value ?? 'recent';
  const query = typeof d.query === 'string' ? d.query.slice(0, MAX_QUERY_LENGTH) : '';
  const tag = typeof d.tag === 'string' ? d.tag.slice(0, MAX_TAG_LENGTH) : '';
  return { tab, query, origin, range, sort, tag };
}
