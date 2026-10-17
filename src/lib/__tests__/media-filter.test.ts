import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MEDIA_VIEW,
  activeFilterCount,
  countByKind,
  countByOrigin,
  filterMedia,
  hasActiveFilters,
  parseMediaView,
  sortMedia,
  type MediaView,
} from '../media-filter';
import type { MediaItem } from '../media-types';

const NOW = Date.parse('2026-10-16T12:00:00Z');
const item = (id: string, over: Partial<MediaItem> = {}): MediaItem => ({
  id,
  kind: 'image',
  origin: 'generator',
  title: id,
  detail: '',
  note: '',
  url: `https://cdn.test/${id}.png`,
  ext: 'png',
  date: '2026-10-15T00:00:00Z',
  sourceHref: '/x',
  ...over,
});
const view = (over: Partial<MediaView> = {}): MediaView => ({ ...DEFAULT_MEDIA_VIEW, ...over });

const ITEMS = [
  item('a', { title: 'Tema 1 · Slide 1', detail: 'Café de Montaña', note: 'taza sobre mesa', date: '2026-10-15T00:00:00Z' }),
  item('b', { title: 'Video · tarea 1', kind: 'video', origin: 'campaign', detail: 'Lanzamiento', date: '2026-09-01T00:00:00Z' }),
  item('c', { title: 'Tema 2 · Slide 1', origin: 'generator', detail: 'Otra', date: '2026-07-01T00:00:00Z' }),
  item('d', { title: 'Publicación del día 2', origin: 'planner', date: '2026-10-10T00:00:00Z' }),
];

describe('filterMedia', () => {
  it('filtra por pestaña y ordena de más reciente a más antiguo', () => {
    expect(filterMedia(ITEMS, view(), {}, NOW).map((i) => i.id)).toEqual(['a', 'd', 'c']);
    expect(filterMedia(ITEMS, view({ tab: 'video' }), {}, NOW).map((i) => i.id)).toEqual(['b']);
  });

  it('busca sin tildes ni mayúsculas, exigiendo todas las palabras, también en el prompt', () => {
    expect(filterMedia(ITEMS, view({ query: 'CAFE montana' }), {}, NOW).map((i) => i.id)).toEqual(['a']);
    expect(filterMedia(ITEMS, view({ query: 'taza mesa' }), {}, NOW).map((i) => i.id)).toEqual(['a']);
    expect(filterMedia(ITEMS, view({ query: 'taza zzz' }), {}, NOW)).toEqual([]);
  });

  it('busca por nombre de origen y por etiquetas locales', () => {
    expect(filterMedia(ITEMS, view({ query: 'programacion' }), {}, NOW).map((i) => i.id)).toEqual(['d']);
    expect(filterMedia(ITEMS, view({ query: 'urgente' }), { c: ['Urgente'] }, NOW).map((i) => i.id)).toEqual(['c']);
  });

  it('filtra por origen, rango de fecha y etiqueta', () => {
    expect(filterMedia(ITEMS, view({ origin: 'planner' }), {}, NOW).map((i) => i.id)).toEqual(['d']);
    expect(filterMedia(ITEMS, view({ range: '7d' }), {}, NOW).map((i) => i.id)).toEqual(['a', 'd']);
    expect(filterMedia(ITEMS, view({ range: '30d', tab: 'video' }), {}, NOW)).toEqual([]);
    expect(filterMedia(ITEMS, view({ range: '90d', tab: 'video' }), {}, NOW).map((i) => i.id)).toEqual(['b']);
    expect(filterMedia(ITEMS, view({ tag: 'URGENTE' }), { c: ['urgente'] }, NOW).map((i) => i.id)).toEqual(['c']);
  });

  it('no muta la entrada', () => {
    const copy = [...ITEMS];
    filterMedia(ITEMS, view({ sort: 'name' }), {}, NOW);
    expect(ITEMS).toEqual(copy);
  });
});

describe('sortMedia', () => {
  it('ordena por antigüedad y por nombre con números naturales', () => {
    expect(sortMedia(ITEMS, 'oldest').map((i) => i.id)).toEqual(['c', 'b', 'd', 'a']);
    const named = [item('x', { title: 'Tema 10' }), item('y', { title: 'Tema 2' }), item('z', { title: 'álbum' })];
    expect(sortMedia(named, 'name').map((i) => i.title)).toEqual(['álbum', 'Tema 2', 'Tema 10']);
  });
});

describe('conteos', () => {
  it('cuenta por pestaña con los demás filtros aplicados', () => {
    expect(countByKind(ITEMS, view(), {}, NOW)).toEqual({ image: 3, video: 1, audio: 0, document: 0 });
    expect(countByKind(ITEMS, view({ origin: 'campaign' }), {}, NOW)).toEqual({ image: 0, video: 1, audio: 0, document: 0 });
    expect(countByKind(ITEMS, view({ query: 'taza' }), {}, NOW).image).toBe(1);
  });

  it('cuenta por origen dentro de la pestaña, sin aplicar el origen', () => {
    expect(countByOrigin(ITEMS, view({ origin: 'planner' }), {}, NOW)).toMatchObject({ all: 3, generator: 2, planner: 1, campaign: 0 });
  });
});

describe('vista guardada', () => {
  it('detecta filtros activos (la pestaña y el orden no cuentan)', () => {
    expect(hasActiveFilters(DEFAULT_MEDIA_VIEW)).toBe(false);
    expect(hasActiveFilters(view({ tab: 'video', sort: 'name' }))).toBe(false);
    expect(hasActiveFilters(view({ query: '  ' }))).toBe(false);
    expect(hasActiveFilters(view({ origin: 'brand' }))).toBe(true);
    expect(activeFilterCount(view({ origin: 'brand', range: '7d', tag: 'x', query: 'q' }))).toBe(3);
  });

  it('parseMediaView ignora basura y valida cada campo', () => {
    expect(parseMediaView(null)).toEqual(DEFAULT_MEDIA_VIEW);
    expect(parseMediaView('{no json')).toEqual(DEFAULT_MEDIA_VIEW);
    expect(parseMediaView('[]')).toEqual(DEFAULT_MEDIA_VIEW);
    expect(parseMediaView(JSON.stringify({ tab: 'raro', origin: 'x', range: '1y', sort: 'z', query: 5 }))).toEqual(DEFAULT_MEDIA_VIEW);
    expect(parseMediaView(JSON.stringify({ tab: 'video', origin: 'campaign', range: '7d', sort: 'name', query: 'hola', tag: 'a' }))).toEqual({
      tab: 'video',
      origin: 'campaign',
      range: '7d',
      sort: 'name',
      query: 'hola',
      tag: 'a',
    });
    expect(parseMediaView(JSON.stringify({ query: 'x'.repeat(500) })).query).toHaveLength(80);
  });
});
