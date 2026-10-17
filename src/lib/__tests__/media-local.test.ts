import { describe, expect, it } from 'vitest';
import {
  MAX_REFS,
  MAX_SAVED_VIEWS,
  MAX_TAGS_PER_ITEM,
  addRef,
  addSavedView,
  addTag,
  guessKind,
  hashUrl,
  normalizeTag,
  parseRefs,
  parseSavedViews,
  parseTags,
  refToItem,
  removeRefs,
  removeSavedView,
  removeTag,
  tagCounts,
} from '../media-local';
import { DEFAULT_MEDIA_VIEW } from '../media-filter';

const NOW = new Date('2026-10-16T00:00:00Z');

describe('referencias por enlace', () => {
  it('añade una referencia válida con título del dominio y tipo por extensión', () => {
    const r = addRef([], { url: 'https://www.ejemplo.com/video/clip.mp4' }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ref).toMatchObject({ title: 'ejemplo.com', kind: 'video', addedAt: NOW.toISOString() });
    expect(r.ref.id).toBe(`reference:${hashUrl('https://www.ejemplo.com/video/clip.mp4')}`);
  });

  it('rechaza esquemas peligrosos, enlaces repetidos y el exceso de referencias', () => {
    expect(addRef([], { url: 'javascript:alert(1)' }, NOW).ok).toBe(false);
    expect(addRef([], { url: 'ejemplo.com/a.png' }, NOW).ok).toBe(false);
    const first = addRef([], { url: 'https://a.test/a.png' }, NOW);
    if (!first.ok) throw new Error('debía ser válida');
    const dup = addRef(first.refs, { url: 'https://a.test/a.png' }, NOW);
    expect(dup).toMatchObject({ ok: false });
    const full = Array.from({ length: MAX_REFS }, (_, i) => ({
      id: `reference:${i}`,
      url: `https://a.test/${i}.png`,
      title: 't',
      kind: 'image' as const,
      addedAt: NOW.toISOString(),
    }));
    expect(addRef(full, { url: 'https://a.test/nueva.png' }, NOW)).toMatchObject({ ok: false });
  });

  it('parseRefs descarta entradas inválidas, repetidas y recalcula el id', () => {
    const raw = JSON.stringify([
      { url: 'https://a.test/a.png', kind: 'image', title: ' Mi foto ', addedAt: '2026-10-01T00:00:00Z' },
      { url: 'https://a.test/a.png', kind: 'image' },
      { url: 'javascript:1', kind: 'image' },
      { url: 'https://a.test/b', kind: 'raro' },
      'basura',
    ]);
    const refs = parseRefs(raw);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ title: 'Mi foto', id: `reference:${hashUrl('https://a.test/a.png')}` });
    expect(parseRefs('{roto')).toEqual([]);
    expect(parseRefs(null)).toEqual([]);
  });

  it('quita referencias y las convierte en activos de origen «reference»', () => {
    const r = addRef([], { url: 'https://a.test/doc.pdf', title: 'Catálogo', kind: 'document' }, NOW);
    if (!r.ok) throw new Error('debía ser válida');
    const item = refToItem(r.ref);
    expect(item).toMatchObject({ origin: 'reference', kind: 'document', url: 'https://a.test/doc.pdf', ext: 'pdf', sourceHref: 'https://a.test/doc.pdf' });
    expect(removeRefs(r.refs, new Set([r.ref.id]))).toEqual([]);
    expect(guessKind('https://a.test/sin-ext')).toBe('image');
  });
});

describe('etiquetas', () => {
  it('normaliza y evita repetidos sin distinguir mayúsculas', () => {
    expect(normalizeTag('  Hola,  mundo ;  ')).toBe('Hola mundo');
    expect(normalizeTag('x'.repeat(60))).toHaveLength(24);
    const m = addTag({}, ['a', 'b'], 'Urgente');
    expect(addTag(m, ['a'], 'urgente')).toEqual({ a: ['Urgente'], b: ['Urgente'] });
    expect(addTag(m, ['a'], '   ')).toEqual(m);
  });

  it('respeta el máximo por activo y no muta el original', () => {
    let m = {};
    for (let i = 0; i < MAX_TAGS_PER_ITEM + 3; i += 1) m = addTag(m, ['a'], `t${i}`);
    expect((m as Record<string, string[]>).a).toHaveLength(MAX_TAGS_PER_ITEM);
    const base = { a: ['x'] };
    addTag(base, ['a'], 'y');
    expect(base).toEqual({ a: ['x'] });
  });

  it('quita etiquetas y limpia activos sin ninguna', () => {
    const m = { a: ['x', 'Y'], b: ['x'] };
    expect(removeTag(m, 'a', 'y')).toEqual({ a: ['x'], b: ['x'] });
    expect(removeTag(m, 'b', 'X')).toEqual({ a: ['x', 'Y'] });
  });

  it('cuenta etiquetas solo de activos vigentes y parsea con tolerancia', () => {
    const m = { a: ['x'], b: ['X', 'z'], gone: ['x'] };
    expect(tagCounts(m, new Set(['a', 'b']))).toEqual([
      { tag: 'x', count: 2 },
      { tag: 'z', count: 1 },
    ]);
    expect(parseTags(JSON.stringify({ a: ['x', 'X', 3, ''], b: 'no', c: [] }))).toEqual({ a: ['x'] });
    expect(parseTags('[]')).toEqual({});
    expect(parseTags('{roto')).toEqual({});
  });
});

describe('vistas guardadas', () => {
  it('guarda sin la pestaña, reemplaza por nombre y limita la cantidad', () => {
    let list = addSavedView([], 'Esta semana', { ...DEFAULT_MEDIA_VIEW, tab: 'video', range: '7d' });
    expect(list[0]).toEqual({ name: 'Esta semana', view: { query: '', origin: 'all', range: '7d', sort: 'recent', tag: '' } });
    list = addSavedView(list, 'esta semana', { ...DEFAULT_MEDIA_VIEW, range: '30d' });
    expect(list).toHaveLength(1);
    expect(list[0].view.range).toBe('30d');
    for (let i = 0; i < MAX_SAVED_VIEWS + 2; i += 1) list = addSavedView(list, `v${i}`, DEFAULT_MEDIA_VIEW);
    expect(list).toHaveLength(MAX_SAVED_VIEWS);
    expect(addSavedView(list, '  ', DEFAULT_MEDIA_VIEW)).toEqual(list);
    expect(removeSavedView(list, 'v3').some((v) => v.name === 'v3')).toBe(false);
  });

  it('parseSavedViews valida cada entrada', () => {
    const raw = JSON.stringify([{ name: 'A', view: { range: '7d', origin: 'x' } }, { name: '', view: {} }, { name: 'B' }, 7]);
    expect(parseSavedViews(raw)).toEqual([{ name: 'A', view: { query: '', origin: 'all', range: '7d', sort: 'recent', tag: '' } }]);
    expect(parseSavedViews('{roto')).toEqual([]);
  });
});
