import { describe, expect, it } from 'vitest';
import { countImagesByTheme, gridProgress, pieceStatus, stageLabel } from '../grid-progress';

describe('pieceStatus', () => {
  it('una pieza vacía está pendiente en todo', () => {
    const p = pieceStatus(undefined, 0, 2);
    expect(p).toMatchObject({ index: 2, idea: 'todo', copy: 'todo', image: 'todo', ready: false, score: 0 });
  });

  it('distingue borrador de copy completo', () => {
    expect(pieceStatus({ title: 'A', caption: 'corto' }, 0).copy).toBe('partial');
    expect(pieceStatus({ title: 'A', caption: 'x'.repeat(60) }, 0).copy).toBe('done');
  });

  it('las imágenes parciales no cierran la pieza', () => {
    const p = pieceStatus({ title: 'A', caption: 'x'.repeat(60) }, 3);
    expect(p.image).toBe('partial');
    expect(p.ready).toBe(false);
  });

  it('idea, copy y 4 imágenes dejan la pieza lista', () => {
    const p = pieceStatus({ title: 'A', caption: 'x'.repeat(60) }, 4);
    expect(p.ready).toBe(true);
    expect(p.score).toBe(1);
  });

  it('ignora espacios y valores negativos', () => {
    const p = pieceStatus({ title: '   ', caption: '  ' }, -3);
    expect(p.idea).toBe('todo');
    expect(p.imageCount).toBe(0);
  });
});

describe('countImagesByTheme', () => {
  it('cuenta slides distintos y descarta índices fuera de rango', () => {
    const counts = countImagesByTheme(
      [
        { themeIndex: 0, slideNumber: 1 },
        { themeIndex: 0, slideNumber: 1 },
        { themeIndex: 0, slideNumber: 2 },
        { themeIndex: 3, slideNumber: 1 },
        { themeIndex: 9, slideNumber: 1 },
        { themeIndex: -1, slideNumber: 1 },
      ],
      7,
    );
    expect(counts).toEqual([2, 0, 0, 1, 0, 0, 0]);
  });
});

describe('gridProgress', () => {
  it('sin datos el avance es 0 %', () => {
    const g = gridProgress([], [], 7);
    expect(g.percent).toBe(0);
    expect(g.pieces).toHaveLength(7);
    expect(g.readyCount).toBe(0);
  });

  it('calcula conteos y porcentaje', () => {
    const themes = Array.from({ length: 7 }, (_, i) => ({ title: `T${i}`, caption: i < 2 ? 'x'.repeat(80) : '' }));
    const assets = [1, 2, 3, 4].map((n) => ({ themeIndex: 0, slideNumber: n }));
    const g = gridProgress(themes, assets, 7);
    expect(g.ideaCount).toBe(7);
    expect(g.copyCount).toBe(2);
    expect(g.imagesTotal).toBe(4);
    expect(g.readyCount).toBe(1);
    // ideas 7 + copys 2 + imágenes 1 = 10 de 21 puntos
    expect(g.percent).toBe(48);
  });
});

describe('stageLabel', () => {
  it('traduce los estados', () => {
    expect(stageLabel('done')).toBe('completo');
    expect(stageLabel('partial')).toBe('en curso');
    expect(stageLabel('todo')).toBe('pendiente');
  });
});
