import { describe, it, expect } from 'vitest';
import {
  DENSITIES,
  DENSITY_KEY,
  DEFAULT_DENSITY,
  DENSITY_LABELS,
  normalizeDensity,
  nextDensity,
  type Density,
} from '../density';

describe('density: constantes', () => {
  it('expone las tres densidades en orden y la clave versionada', () => {
    expect(DENSITIES).toEqual(['compact', 'comfortable', 'spacious']);
    expect(DENSITY_KEY).toBe('rai-density-v1');
    expect(DEFAULT_DENSITY).toBe('comfortable');
  });

  it('tiene una etiqueta en español por cada densidad', () => {
    expect(DENSITY_LABELS).toEqual({
      compact: 'Compacta',
      comfortable: 'Estándar',
      spacious: 'Espaciosa',
    });
  });
});

describe('normalizeDensity', () => {
  for (const d of ['compact', 'comfortable', 'spacious'] as Density[]) {
    it(`acepta el valor válido '${d}'`, () => {
      expect(normalizeDensity(d)).toBe(d);
    });
  }

  const invalid: unknown[] = [
    undefined,
    null,
    '',
    'Compact',
    'COMFORTABLE',
    ' spacious ',
    'dense',
    0,
    1,
    true,
    {},
    [],
    ['compact'],
  ];
  for (const raw of invalid) {
    it(`devuelve 'comfortable' ante ${JSON.stringify(raw) ?? String(raw)}`, () => {
      expect(normalizeDensity(raw)).toBe('comfortable');
    });
  }
});

describe('nextDensity', () => {
  it('cicla compact → comfortable → spacious → compact', () => {
    expect(nextDensity('compact')).toBe('comfortable');
    expect(nextDensity('comfortable')).toBe('spacious');
    expect(nextDensity('spacious')).toBe('compact');
  });

  it('tres pasos devuelven al punto de partida', () => {
    for (const start of DENSITIES) {
      expect(nextDensity(nextDensity(nextDensity(start)))).toBe(start);
    }
  });

  it('un valor inválido se trata como la densidad por defecto', () => {
    expect(nextDensity('otra' as unknown as Density)).toBe('spacious');
  });
});
