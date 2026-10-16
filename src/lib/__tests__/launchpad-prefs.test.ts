import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAUNCHPAD_PREFS, filterItems, parseLaunchpadPrefs, pickInitialCategory, serializeLaunchpadPrefs, splitCategories,
  stepState, toggleSkipped,
} from '../launchpad-prefs';

const IDS = ['a1', 'a2', 'b1'];
const CATS = [
  { id: 'a', items: [{ id: 'a1' }, { id: 'a2' }] },
  { id: 'b', items: [{ id: 'b1' }] },
];

describe('parseLaunchpadPrefs', () => {
  it('sin datos o con datos rotos devuelve los valores predeterminados', () => {
    expect(parseLaunchpadPrefs(null, IDS)).toEqual(DEFAULT_LAUNCHPAD_PREFS);
    expect(parseLaunchpadPrefs('{rota', IDS)).toEqual(DEFAULT_LAUNCHPAD_PREFS);
    expect(parseLaunchpadPrefs('null', IDS)).toEqual(DEFAULT_LAUNCHPAD_PREFS);
  });

  it('descarta ids desconocidos y duplicados y valida el filtro', () => {
    const raw = JSON.stringify({ skipped: ['a1', 'a1', 'fantasma', 3], filter: 'all', doneCollapsed: false });
    expect(parseLaunchpadPrefs(raw, IDS)).toEqual({ skipped: ['a1'], filter: 'all', doneCollapsed: false });
    expect(parseLaunchpadPrefs(JSON.stringify({ filter: 'otro' }), IDS).filter).toBe('pending');
  });

  it('ida y vuelta', () => {
    const prefs = { skipped: ['a2'], filter: 'all' as const, doneCollapsed: false };
    expect(parseLaunchpadPrefs(serializeLaunchpadPrefs(prefs), IDS)).toEqual(prefs);
  });

  it('los predeterminados no se comparten por referencia', () => {
    const a = parseLaunchpadPrefs(null, IDS);
    a.skipped.push('a1');
    expect(parseLaunchpadPrefs(null, IDS).skipped).toEqual([]);
  });
});

describe('pasos pospuestos', () => {
  it('toggleSkipped pospone y retoma', () => {
    const once = toggleSkipped(DEFAULT_LAUNCHPAD_PREFS, 'a1');
    expect(once.skipped).toEqual(['a1']);
    expect(toggleSkipped(once, 'a1').skipped).toEqual([]);
    expect(DEFAULT_LAUNCHPAD_PREFS.skipped).toEqual([]);
  });

  it('stepState: completado gana sobre pospuesto', () => {
    expect(stepState('a1', ['a1'], ['a1'])).toBe('done');
    expect(stepState('a1', [], ['a1'])).toBe('skipped');
    expect(stepState('a1', [], [])).toBe('pending');
  });
});

describe('filtros y categorías', () => {
  it('«pendientes» oculta completados salvo los recién marcados; «todos» muestra todo', () => {
    const items = [{ id: 'a1' }, { id: 'a2' }];
    expect(filterItems(items, ['a1'], 'pending').map((i) => i.id)).toEqual(['a2']);
    expect(filterItems(items, ['a1'], 'pending', new Set(['a1'])).map((i) => i.id)).toEqual(['a1', 'a2']);
    expect(filterItems(items, ['a1'], 'all')).toHaveLength(2);
  });

  it('splitCategories separa completas de en curso', () => {
    const { active, finished } = splitCategories(CATS, ['b1']);
    expect(active.map((c) => c.id)).toEqual(['a']);
    expect(finished.map((c) => c.id)).toEqual(['b']);
    expect(splitCategories([{ id: 'x', items: [] }], []).active).toHaveLength(1);
  });

  it('pickInitialCategory abre la del siguiente paso útil', () => {
    expect(pickInitialCategory(CATS, [], [])).toBe('a');
    expect(pickInitialCategory(CATS, ['a1', 'a2'], [])).toBe('b');
    expect(pickInitialCategory(CATS, [], ['a1', 'a2'])).toBe('b');
    expect(pickInitialCategory(CATS, ['b1'], ['a1', 'a2'])).toBe('a');
    expect(pickInitialCategory(CATS, ['a1', 'a2', 'b1'], [])).toBe('a');
    expect(pickInitialCategory([], [], [])).toBeUndefined();
  });
});
