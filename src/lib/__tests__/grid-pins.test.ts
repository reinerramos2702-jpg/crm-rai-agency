import { describe, expect, it } from 'vitest';
import { parsePinned, pinnedFirst, togglePinned } from '../grid-filters';

describe('grillas fijadas', () => {
  it('parsePinned tolera datos corruptos y duplicados', () => {
    expect(parsePinned(null)).toEqual([]);
    expect(parsePinned('no json')).toEqual([]);
    expect(parsePinned('{"a":1}')).toEqual([]);
    expect(parsePinned('["a","a",3,"","b"]')).toEqual(['a', 'b']);
  });

  it('togglePinned fija y desfija sin mutar', () => {
    const base = ['a'];
    expect(togglePinned(base, 'b')).toEqual(['a', 'b']);
    expect(togglePinned(['a', 'b'], 'a')).toEqual(['b']);
    expect(base).toEqual(['a']);
  });

  it('pinnedFirst conserva el orden relativo', () => {
    const grids = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
    expect(pinnedFirst(grids, ['4', '2']).map((g) => g.id)).toEqual(['2', '4', '1', '3']);
    expect(pinnedFirst(grids, []).map((g) => g.id)).toEqual(['1', '2', '3', '4']);
    expect(pinnedFirst(grids, ['zz']).map((g) => g.id)).toEqual(['1', '2', '3', '4']);
  });
});
