import { describe, it, expect } from 'vitest';
import { categoryPercent, computeNextStep, countCompleted, detectMilestone } from '../launchpad-progress';

const CATS = [
  { id: 'a', items: [{ id: 'a1' }, { id: 'a2' }] },
  { id: 'b', items: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }] },
] as const;
const ALL = ['a1', 'a2', 'b1', 'b2', 'b3'];

describe('computeNextStep', () => {
  it('devuelve el primer pendiente en el orden de la guía, con su categoría', () => {
    const next = computeNextStep(CATS, ['a1', 'b1']);
    expect(next?.item.id).toBe('a2');
    expect(next?.category.id).toBe('a');
  });

  it('salta categorías completas', () => {
    const next = computeNextStep(CATS, ['a1', 'a2', 'b1']);
    expect(next?.item.id).toBe('b2');
    expect(next?.category.id).toBe('b');
  });

  it('sin nada completado devuelve el primer paso de la primera categoría', () => {
    const next = computeNextStep(CATS, []);
    expect(next?.item.id).toBe('a1');
    expect(next?.category.id).toBe('a');
  });

  it('devuelve undefined si todo está completo', () => {
    expect(computeNextStep(CATS, ALL)).toBeUndefined();
  });

  it('devuelve undefined si no hay pasos', () => {
    expect(computeNextStep([], [])).toBeUndefined();
    expect(computeNextStep([{ id: 'x', items: [] }], ['a1'])).toBeUndefined();
  });

  it('ignora ids completados que no existen en la guía', () => {
    expect(computeNextStep(CATS, ['fantasma'])?.item.id).toBe('a1');
  });
});

describe('categoryPercent / countCompleted', () => {
  it('calcula el porcentaje redondeado', () => {
    expect(categoryPercent(CATS[1], ['b1'])).toBe(33);
    expect(categoryPercent(CATS[1], ['b1', 'b2'])).toBe(67);
    expect(categoryPercent(CATS[0], ['a1'])).toBe(50);
  });

  it('vale 0 sin pasos completados y 100 con todos', () => {
    expect(categoryPercent(CATS[0], [])).toBe(0);
    expect(categoryPercent(CATS[0], ['a1', 'a2'])).toBe(100);
  });

  it('vale 0 en una categoría sin pasos (sin dividir entre cero)', () => {
    expect(categoryPercent({ id: 'v', items: [] }, ['a1'])).toBe(0);
  });

  it('cuenta solo ids de la propia categoría', () => {
    expect(countCompleted(CATS[0], ['a1', 'b1', 'b2'])).toBe(1);
  });
});

describe('detectMilestone', () => {
  it('detecta la transición a 100 %', () => {
    const m = detectMilestone(ALL.slice(0, 4), ALL, CATS);
    expect(m.overallCompleted).toBe(true);
    expect(m.newlyDone).toEqual(['b3']);
    expect(m.categoriesCompleted).toEqual(['b']);
  });

  it('no celebra un estado que ya estaba completo', () => {
    const m = detectMilestone(ALL, ALL, CATS);
    expect(m).toEqual({ newlyDone: [], categoriesCompleted: [], overallCompleted: false });
  });

  it('detecta una categoría completada sin llegar al total', () => {
    const m = detectMilestone(['a1'], ['a1', 'a2'], CATS);
    expect(m.categoriesCompleted).toEqual(['a']);
    expect(m.overallCompleted).toBe(false);
    expect(m.newlyDone).toEqual(['a2']);
  });

  it('puede completar varias categorías a la vez (p. ej. una actualización por detrás)', () => {
    const m = detectMilestone([], ALL, CATS);
    expect(m.categoriesCompleted).toEqual(['a', 'b']);
    expect(m.overallCompleted).toBe(true);
  });

  it('no hay hito al avanzar sin completar una categoría', () => {
    const m = detectMilestone([], ['a1'], CATS);
    expect(m.categoriesCompleted).toEqual([]);
    expect(m.overallCompleted).toBe(false);
  });

  it('desmarcar un paso no genera hitos', () => {
    const m = detectMilestone(ALL, ALL.filter((id) => id !== 'a1'), CATS);
    expect(m).toEqual({ newlyDone: [], categoriesCompleted: [], overallCompleted: false });
  });

  it('sin pasos nunca hay hito', () => {
    expect(detectMilestone([], [], [])).toEqual({ newlyDone: [], categoriesCompleted: [], overallCompleted: false });
    expect(detectMilestone([], ['x'], [{ id: 'v', items: [] }]).overallCompleted).toBe(false);
  });

  it('ignora ids ajenos a la guía al decidir si hay hito', () => {
    const m = detectMilestone(ALL.slice(0, 4), [...ALL, 'fantasma'], CATS);
    expect(m.overallCompleted).toBe(true);
    expect(m.newlyDone).toEqual(['b3', 'fantasma']);
  });

  it('el último paso de la guía dispara a la vez categoría e hito global', () => {
    const m = detectMilestone(['a1', 'a2', 'b1', 'b2'], ALL, CATS);
    expect(m).toEqual({ newlyDone: ['b3'], categoriesCompleted: ['b'], overallCompleted: true });
  });
});
