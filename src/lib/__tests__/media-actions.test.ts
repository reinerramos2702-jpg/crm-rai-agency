import { describe, expect, it } from 'vitest';
import { buildCsv, linksText, slugify, stepIndex, suggestFileName, usageTargets } from '../media-actions';
import type { MediaItem } from '../media-types';

const item = (over: Partial<MediaItem> = {}): MediaItem => ({
  id: 'generator:1',
  kind: 'image',
  origin: 'generator',
  title: 'Tema 1 · Slide 2',
  detail: 'Café, "Montaña"',
  note: '',
  url: 'https://cdn.test/a.png',
  ext: 'png',
  date: '2026-10-10T10:00:00.000Z',
  sourceHref: '/generador-imagenes/g1',
  ...over,
});

describe('nombres de archivo', () => {
  it('slugify quita tildes y símbolos', () => {
    expect(slugify('Café de Montaña · Tema 1')).toBe('cafe-de-montana-tema-1');
    expect(slugify('***')).toBe('archivo');
  });

  it('suggestFileName usa la extensión real o una por defecto según el tipo', () => {
    expect(suggestFileName(item())).toBe('cafe-montana-tema-1-slide-2.png');
    expect(suggestFileName(item({ ext: '', kind: 'video' }))).toMatch(/\.mp4$/);
    expect(suggestFileName(item({ ext: '', kind: 'document' }))).toMatch(/\.txt$/);
  });
});

describe('enlaces y CSV', () => {
  it('linksText omite activos sin archivo', () => {
    expect(linksText([item(), item({ id: 'b', url: null }), item({ id: 'c', url: 'https://cdn.test/c.png' })])).toBe(
      'https://cdn.test/a.png\nhttps://cdn.test/c.png',
    );
  });

  it('buildCsv escapa comillas y neutraliza fórmulas', () => {
    const csv = buildCsv([item({ title: '=SUMA(1)' })]);
    const [head, row] = csv.split('\r\n');
    expect(head).toBe('Título,Tipo,Origen,Contexto,Fecha,Enlace');
    expect(row).toBe(`'=SUMA(1),Imagen,Generador,"Café, ""Montaña""",2026-10-10,https://cdn.test/a.png`);
  });
});

describe('«Usar en…»', () => {
  it('ofrece destinos según el tipo y ninguno sin archivo', () => {
    expect(usageTargets(item()).map((t) => t.id)).toEqual(['campaign', 'generator', 'schedule']);
    expect(usageTargets(item({ kind: 'video' })).map((t) => t.id)).toEqual(['campaign', 'schedule']);
    expect(usageTargets(item({ kind: 'document' })).map((t) => t.id)).toEqual(['campaign']);
    expect(usageTargets(item({ url: null }))).toEqual([]);
  });
});

describe('stepIndex', () => {
  it('da la vuelta en los extremos y tolera listas vacías', () => {
    expect(stepIndex(0, -1, 3)).toBe(2);
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(1, 1, 3)).toBe(2);
    expect(stepIndex(0, 1, 0)).toBe(-1);
  });
});
