import { describe, expect, it } from 'vitest';
import {
  LAUNCHPAD_CATEGORIES, LAUNCHPAD_STEPS, LAUNCHPAD_TOTAL, isManualStep, nextBestAction, remainingMinutes,
} from '../launchpad-steps';
import { MANUAL_LAUNCHPAD_ITEM_IDS } from '../launchpad-items';
import { MODULE_ACCESS } from '../roles-shared';

describe('datos de la Guía de Inicio', () => {
  it('tiene 22 pasos con ids únicos y datos completos', () => {
    expect(LAUNCHPAD_TOTAL).toBe(22);
    expect(new Set(LAUNCHPAD_STEPS.map((s) => s.id)).size).toBe(22);
    for (const s of LAUNCHPAD_STEPS) {
      expect(s.title.length).toBeGreaterThan(5);
      expect(s.description.length).toBeGreaterThan(10);
      expect(s.minutes).toBeGreaterThan(0);
      expect(s.href.startsWith('/')).toBe(true);
      expect(MODULE_ACCESS[s.href], `ruta ${s.href}`).toBeDefined();
    }
  });

  it('los pasos manuales de la API existen aquí y los automáticos explican qué los completa', () => {
    const ids = new Set(LAUNCHPAD_STEPS.map((s) => s.id));
    for (const m of MANUAL_LAUNCHPAD_ITEM_IDS) {
      expect(ids.has(m), m).toBe(true);
      expect(isManualStep(m)).toBe(true);
    }
    for (const s of LAUNCHPAD_STEPS) {
      if (isManualStep(s.id)) expect(s.autoHow, s.id).toBeNull();
      else expect(s.autoHow, s.id).toMatch(/^Se completa /);
    }
  });

  it('las categorías suman todos los pasos', () => {
    expect(LAUNCHPAD_CATEGORIES.flatMap((c) => c.items)).toHaveLength(LAUNCHPAD_TOTAL);
  });
});

describe('nextBestAction', () => {
  it('sin nada hecho sugiere el primer paso', () => {
    const next = nextBestAction([]);
    expect(next?.step.id).toBe('crear-contacto');
    expect(next?.category.id).toBe('base');
    expect(next?.fromSkipped).toBe(false);
  });

  it('salta los pospuestos y los completados', () => {
    const next = nextBestAction(['crear-contacto'], ['importar-contactos']);
    expect(next?.step.id).toBe('embudo-captacion');
  });

  it('si solo quedan pospuestos, sugiere retomar el primero', () => {
    const all = LAUNCHPAD_STEPS.map((s) => s.id);
    const left = ['roles-equipo', 'facturas'];
    const completed = all.filter((id) => !left.includes(id));
    const next = nextBestAction(completed, left);
    expect(next?.fromSkipped).toBe(true);
    expect(next?.step.id).toBe('facturas');
  });

  it('devuelve undefined con todo completo', () => {
    expect(nextBestAction(LAUNCHPAD_STEPS.map((s) => s.id))).toBeUndefined();
  });
});

describe('remainingMinutes', () => {
  it('suma solo lo pendiente', () => {
    const total = LAUNCHPAD_STEPS.reduce((a, s) => a + s.minutes, 0);
    expect(remainingMinutes([])).toBe(total);
    expect(remainingMinutes(['crear-contacto'])).toBe(total - 2);
    expect(remainingMinutes(LAUNCHPAD_STEPS.map((s) => s.id))).toBe(0);
  });
});
