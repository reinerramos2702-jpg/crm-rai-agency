import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, applyNameTemplate, parsePrefs, serializePrefs, sortFlows } from '../automation-prefs';

describe('parsePrefs', () => {
  it('devuelve los valores por defecto con datos vacíos o corruptos', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('no es json')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('42')).toEqual(DEFAULT_PREFS);
  });

  it('conserva valores válidos y descarta los inválidos campo a campo', () => {
    const raw = JSON.stringify({ flowSort: 'nombre', showDescriptions: false, displayZone: 'Marte', activityRefresh: 30, nameTemplate: 'sin token' });
    expect(parsePrefs(raw)).toEqual({
      ...DEFAULT_PREFS,
      flowSort: 'nombre',
      showDescriptions: false,
      activityRefresh: 30,
    });
  });

  it('valida las preferencias de seguridad y densidad', () => {
    expect(parsePrefs(JSON.stringify({ confirmSend: false, density: 'compact' }))).toMatchObject({ confirmSend: false, density: 'compact' });
    expect(parsePrefs(JSON.stringify({ confirmSend: 'no', density: 'enorme' }))).toMatchObject({ confirmSend: true, density: 'comfortable' });
  });

  it('ida y vuelta', () => {
    const prefs = { ...DEFAULT_PREFS, nameTemplate: '{nombre} · {fecha}', displayZone: 'local' as const };
    expect(parsePrefs(serializePrefs(prefs))).toEqual(prefs);
  });
});

describe('applyNameTemplate', () => {
  it('sustituye nombre y fecha', () => {
    const now = new Date(2026, 9, 16);
    expect(applyNameTemplate('{nombre}', 'Bienvenida', now)).toBe('Bienvenida');
    expect(applyNameTemplate('{nombre} · {fecha}', 'Bienvenida', now)).toContain('Bienvenida · 16');
  });
});

describe('sortFlows', () => {
  const flows = [
    { name: 'b', updatedAt: '2026-01-02', runsCount: 1 },
    { name: 'a', updatedAt: '2026-01-01', runsCount: 5, _count: { runs: 7 } },
  ];
  it('ordena por nombre y por ejecuciones sin mutar', () => {
    expect(sortFlows(flows, 'recientes')).toBe(flows);
    expect(sortFlows(flows, 'nombre')[0].name).toBe('a');
    expect(sortFlows(flows, 'ejecuciones')[0].name).toBe('a');
    expect(flows[0].name).toBe('b');
  });
});
