import { describe, expect, it } from 'vitest';
import {
  DRAFT_ENVELOPE_VERSION,
  DRAFT_TTL_MS,
  formatDraftAge,
  parseDraft,
  readDraft,
  removeDraft,
  serializeDraft,
  stableStringify,
  writeDraft,
  type DraftStorage,
} from '../draft-storage';

interface Sample {
  title: string;
}
const isSample = (v: unknown): v is Sample =>
  typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).title === 'string';

function fakeStorage(initial: Record<string, string> = {}): DraftStorage & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const NOW = 1_800_000_000_000;

describe('parseDraft', () => {
  it('acepta un sobre vigente con la forma esperada', () => {
    const raw = serializeDraft({ title: 'hola' }, NOW - 1000);
    expect(parseDraft(raw, { validate: isSample, now: NOW })).toEqual({ data: { title: 'hola' }, savedAt: NOW - 1000 });
  });

  it('rechaza texto vacío, JSON roto y valores que no son sobres', () => {
    expect(parseDraft(null, { validate: isSample, now: NOW })).toBeNull();
    expect(parseDraft('', { validate: isSample, now: NOW })).toBeNull();
    expect(parseDraft('{no es json', { validate: isSample, now: NOW })).toBeNull();
    expect(parseDraft('42', { validate: isSample, now: NOW })).toBeNull();
    expect(parseDraft('null', { validate: isSample, now: NOW })).toBeNull();
  });

  it('rechaza otra versión de sobre', () => {
    const raw = JSON.stringify({ v: DRAFT_ENVELOPE_VERSION + 1, savedAt: NOW, data: { title: 'x' } });
    expect(parseDraft(raw, { validate: isSample, now: NOW })).toBeNull();
  });

  it('rechaza fechas inválidas o del futuro, pero tolera un desfase pequeño de reloj', () => {
    const bad = JSON.stringify({ v: DRAFT_ENVELOPE_VERSION, savedAt: 'ayer', data: { title: 'x' } });
    expect(parseDraft(bad, { validate: isSample, now: NOW })).toBeNull();
    expect(parseDraft(serializeDraft({ title: 'x' }, NOW + 60 * 60 * 1000), { validate: isSample, now: NOW })).toBeNull();
    expect(parseDraft(serializeDraft({ title: 'x' }, NOW + 60 * 1000), { validate: isSample, now: NOW })).not.toBeNull();
  });

  it('caduca a los 7 días', () => {
    expect(DRAFT_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseDraft(serializeDraft({ title: 'x' }, NOW - DRAFT_TTL_MS), { validate: isSample, now: NOW })).not.toBeNull();
    expect(parseDraft(serializeDraft({ title: 'x' }, NOW - DRAFT_TTL_MS - 1), { validate: isSample, now: NOW })).toBeNull();
  });

  it('respeta un TTL personalizado y descarta datos con otra forma', () => {
    expect(parseDraft(serializeDraft({ title: 'x' }, NOW - 5000), { validate: isSample, now: NOW, ttlMs: 1000 })).toBeNull();
    expect(parseDraft(serializeDraft({ otro: 1 }, NOW), { validate: isSample, now: NOW })).toBeNull();
  });
});

describe('readDraft / writeDraft / removeDraft', () => {
  it('guarda y recupera', () => {
    const storage = fakeStorage();
    expect(writeDraft('k', { title: 'a' }, NOW, storage)).toBe(true);
    expect(readDraft('k', { validate: isSample, now: NOW }, storage)?.data).toEqual({ title: 'a' });
  });

  it('devuelve null si no hay nada guardado, sin tocar el almacenamiento', () => {
    const storage = fakeStorage();
    expect(readDraft('k', { validate: isSample, now: NOW }, storage)).toBeNull();
    expect(storage.map.size).toBe(0);
  });

  it('elimina lo corrupto o caducado al leerlo', () => {
    const storage = fakeStorage({ roto: 'xx', viejo: serializeDraft({ title: 'a' }, NOW - DRAFT_TTL_MS - 5) });
    expect(readDraft('roto', { validate: isSample, now: NOW }, storage)).toBeNull();
    expect(readDraft('viejo', { validate: isSample, now: NOW }, storage)).toBeNull();
    expect(storage.map.size).toBe(0);
  });

  it('removeDraft borra la clave', () => {
    const storage = fakeStorage({ k: serializeDraft({ title: 'a' }, NOW) });
    removeDraft('k', storage);
    expect(storage.map.has('k')).toBe(false);
  });

  it('tolera almacenamiento ausente o que lanza errores', () => {
    const throwing: DraftStorage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('lleno');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(writeDraft('k', { title: 'a' }, NOW, null)).toBe(false);
    expect(readDraft('k', { validate: isSample, now: NOW }, null)).toBeNull();
    expect(writeDraft('k', { title: 'a' }, NOW, throwing)).toBe(false);
    expect(readDraft('k', { validate: isSample, now: NOW }, throwing)).toBeNull();
    expect(() => removeDraft('k', throwing)).not.toThrow();
    expect(() => removeDraft('k', null)).not.toThrow();
  });
});

describe('stableStringify', () => {
  it('no depende del orden de las claves, tampoco en objetos anidados', () => {
    expect(stableStringify({ a: 1, b: { x: 1, y: 2 } })).toBe(stableStringify({ b: { y: 2, x: 1 }, a: 1 }));
  });

  it('distingue valores distintos y conserva el orden de los arreglos', () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });
});

describe('formatDraftAge', () => {
  const min = 60_000;
  it('usa la unidad adecuada con singular y plural', () => {
    expect(formatDraftAge(NOW, NOW)).toBe('menos de un minuto');
    expect(formatDraftAge(NOW - min, NOW)).toBe('1 minuto');
    expect(formatDraftAge(NOW - 5 * min, NOW)).toBe('5 minutos');
    expect(formatDraftAge(NOW - 60 * min, NOW)).toBe('1 hora');
    expect(formatDraftAge(NOW - 3 * 60 * min, NOW)).toBe('3 horas');
    expect(formatDraftAge(NOW - 24 * 60 * min, NOW)).toBe('1 día');
    expect(formatDraftAge(NOW - 3 * 24 * 60 * min, NOW)).toBe('3 días');
  });

  it('no devuelve edades negativas si el reloj está adelantado', () => {
    expect(formatDraftAge(NOW + 10 * min, NOW)).toBe('menos de un minuto');
  });
});
