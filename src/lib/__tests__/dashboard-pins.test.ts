import { describe, expect, it } from 'vitest';
import { DEFAULT_PINS, MAX_PINS, QUICK_ACTIONS, availablePins, canOpen, movePin, parsePins, resolvePins, togglePin } from '../dashboard-pins';
import { MODULE_ACCESS } from '../roles-shared';

describe('accesos rápidos', () => {
  it('todos los accesos apuntan a un módulo con matriz de acceso', () => {
    for (const a of QUICK_ACTIONS) {
      expect(MODULE_ACCESS[a.href], a.href).toBeDefined();
    }
    expect(new Set(QUICK_ACTIONS.map((a) => a.id)).size).toBe(QUICK_ACTIONS.length);
  });

  it('parsePins descarta ids desconocidos, duplicados y respeta el máximo', () => {
    expect(parsePins(null)).toEqual(DEFAULT_PINS);
    expect(parsePins('{roto')).toEqual(DEFAULT_PINS);
    expect(parsePins('{"a":1}')).toEqual(DEFAULT_PINS);
    expect(parsePins(JSON.stringify(['chat', 'chat', 'nada', 'calendar']))).toEqual(['chat', 'calendar']);
    const all = QUICK_ACTIONS.map((a) => a.id);
    expect(parsePins(JSON.stringify(all))).toHaveLength(MAX_PINS);
    expect(parsePins('[]')).toEqual([]);
  });

  it('togglePin añade, quita y no pasa del máximo', () => {
    expect(togglePin(['chat'], 'calendar')).toEqual(['chat', 'calendar']);
    expect(togglePin(['chat', 'calendar'], 'chat')).toEqual(['calendar']);
    expect(togglePin(['chat'], 'inexistente')).toEqual(['chat']);
    const full = QUICK_ACTIONS.slice(0, MAX_PINS).map((a) => a.id);
    expect(togglePin(full, QUICK_ACTIONS[MAX_PINS].id)).toEqual(full);
  });

  it('movePin intercambia posiciones y respeta los bordes', () => {
    expect(movePin(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(movePin(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(movePin(['a', 'b'], 'a', -1)).toEqual(['a', 'b']);
    expect(movePin(['a', 'b'], 'b', 1)).toEqual(['a', 'b']);
    expect(movePin(['a', 'b'], 'zz', 1)).toEqual(['a', 'b']);
  });

  it('el rol filtra los accesos que no puede abrir', () => {
    expect(canOpen('/pagos', 'agente')).toBe(false);
    expect(canOpen('/pagos', 'admin')).toBe(true);
    expect(canOpen('/pagos', null)).toBe(true);
    const viewer = resolvePins(['campaign', 'chat'], 'viewer').map((a) => a.id);
    expect(viewer).toEqual(['chat']);
    expect(availablePins(['chat'], 'viewer').some((a) => a.id === 'payments')).toBe(true);
    expect(availablePins([], 'agente').some((a) => a.id === 'payments')).toBe(false);
  });
});
