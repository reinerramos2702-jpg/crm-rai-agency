import { describe, expect, it } from 'vitest';
import {
  EMPTY_CONFIG,
  LIMITS,
  isValidTime,
  isValidTimezone,
  normalizeIgHandle,
  parseStoredConfig,
  sanitizeContentPlannerConfig,
} from '../content-planner-config';

describe('normalizeIgHandle', () => {
  it('agrega @ único y quita espacios', () => {
    expect(normalizeIgHandle(' mi marca ')).toBe('@mimarca');
    expect(normalizeIgHandle('@@hotel')).toBe('@hotel');
  });
  it('vacío o solo @ → vacío (sin handle de otro negocio por defecto)', () => {
    expect(normalizeIgHandle('')).toBe('');
    expect(normalizeIgHandle('@')).toBe('');
  });
  it('recorta a 30 caracteres de usuario', () => {
    expect(normalizeIgHandle('a'.repeat(50))).toHaveLength(31);
  });
});

describe('isValidTime / isValidTimezone', () => {
  it('acepta HH:MM 24h y rechaza fuera de rango', () => {
    expect(isValidTime('09:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:00')).toBe(false);
    expect(isValidTime('12:60')).toBe(false);
    expect(isValidTime(900)).toBe(false);
  });
  it('acepta IANA y rechaza basura', () => {
    expect(isValidTimezone('America/Bogota')).toBe(true);
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone(null)).toBe(false);
  });
});

describe('sanitizeContentPlannerConfig', () => {
  it('ignora claves no permitidas (uploadedPhotos, __proto__, workspaceId)', () => {
    const out = sanitizeContentPlannerConfig({
      uploadedPhotos: ['x'],
      workspaceId: 'otro',
      ['__proto__']: { polluted: true },
      businessName: 'Café Central',
    }) as unknown as Record<string, unknown>;
    expect(out.uploadedPhotos).toBeUndefined();
    expect(out.workspaceId).toBeUndefined();
    expect(out.businessName).toBe('Café Central');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('valores inválidos conservan la base', () => {
    const out = sanitizeContentPlannerConfig({
      publishTime: '99:99',
      timezone: 'Nope/Zone',
      autoPublish: 'sí',
      businessName: 42,
    });
    expect(out.publishTime).toBe(EMPTY_CONFIG.publishTime);
    expect(out.timezone).toBe(EMPTY_CONFIG.timezone);
    expect(out.autoPublish).toBe(false);
    expect(out.businessName).toBe('');
  });

  it('input no objeto → config vacía válida', () => {
    expect(sanitizeContentPlannerConfig(null)).toEqual(EMPTY_CONFIG);
    expect(sanitizeContentPlannerConfig('x')).toEqual(EMPTY_CONFIG);
  });

  it('no muta la base compartida', () => {
    const out = sanitizeContentPlannerConfig({ brandRules: [{ forbidden: 'a', replacement: 'b', reason: '' }] });
    expect(out.brandRules).toHaveLength(1);
    expect(EMPTY_CONFIG.brandRules).toEqual([]);
  });

  it('colores: texto libre recortado', () => {
    expect(sanitizeContentPlannerConfig({ brandColors: 'Azul, dorado' }).brandColors).toBe('Azul, dorado');
    expect(sanitizeContentPlannerConfig({ brandColors: 'x'.repeat(999) }).brandColors).toHaveLength(LIMITS.short);
  });

  it('reglas: descarta vacías, recorta campos y máx. 100', () => {
    const rules = [
      { forbidden: 'barato', replacement: 'accesible', reason: 'posicionamiento' },
      { forbidden: '', replacement: '', reason: 'huérfana' },
      'basura',
      ...Array.from({ length: 150 }, (_, i) => ({ forbidden: `p${i}`, replacement: 'x', reason: '' })),
    ];
    const out = sanitizeContentPlannerConfig({ brandRules: rules });
    expect(out.brandRules.length).toBeLessThanOrEqual(LIMITS.rules);
    expect(out.brandRules[0].forbidden).toBe('barato');
    expect(out.brandRules.every((r) => r.forbidden || r.replacement)).toBe(true);
  });

  it('recorta strings largos a su tope', () => {
    const out = sanitizeContentPlannerConfig({
      businessName: 'a'.repeat(1000),
      services: 'b'.repeat(20_000),
      brandDocContent: 'c'.repeat(500_000),
    });
    expect(out.businessName).toHaveLength(LIMITS.short);
    expect(out.services).toHaveLength(LIMITS.long);
    expect(out.brandDocContent).toHaveLength(LIMITS.brandDoc);
  });

  it('normaliza el handle recibido', () => {
    expect(sanitizeContentPlannerConfig({ igHandle: ' mi.marca ' }).igHandle).toBe('@mi.marca');
  });

  it('mezcla sobre una base existente', () => {
    const base = sanitizeContentPlannerConfig({ businessName: 'A', services: 'S' });
    const out = sanitizeContentPlannerConfig({ businessName: 'B' }, base);
    expect(out.businessName).toBe('B');
    expect(out.services).toBe('S');
  });
});

describe('parseStoredConfig', () => {
  it('null → vacía', () => {
    expect(parseStoredConfig(null)).toEqual(EMPTY_CONFIG);
  });
  it('JSON guardado válido se recupera', () => {
    expect(parseStoredConfig({ businessName: 'X', publishTime: '18:30' }).publishTime).toBe('18:30');
  });
});
