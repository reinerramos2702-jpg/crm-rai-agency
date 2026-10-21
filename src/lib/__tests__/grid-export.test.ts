import { describe, expect, it } from 'vitest';
import { allCopysText, buildPieces, exportFileName, imageFileName, toCsv, toJson, toTxt } from '../grid-export';

const THEMES = [
  { title: 'Error común', category: 'Educativo', caption: 'Copy uno, con "comillas"\ny salto' },
  { title: 'Guía', category: 'Educativo', caption: '' },
  { title: '=SUMA(1)', category: 'Oferta', caption: '@mención' },
];
const ASSETS = [
  { themeIndex: 0, slideNumber: 2, publicUrl: 'https://x/2.png' },
  { themeIndex: 0, slideNumber: 1, publicUrl: 'https://x/1.png' },
  { themeIndex: 2, slideNumber: 1, publicUrl: 'https://x/3.png' },
];

describe('buildPieces', () => {
  const pieces = buildPieces(THEMES, ASSETS, 7);
  it('siempre devuelve el total de días con imágenes ordenadas por slide', () => {
    expect(pieces).toHaveLength(7);
    expect(pieces[0].imageUrls).toEqual(['https://x/1.png', 'https://x/2.png']);
    expect(pieces[5]).toMatchObject({ day: 6, title: '', caption: '', imageUrls: [] });
  });
});

describe('textos de exportación', () => {
  const pieces = buildPieces(THEMES, ASSETS, 3);

  it('allCopysText omite los días sin copy', () => {
    const text = allCopysText(pieces);
    expect(text).toContain('DÍA 1 · Error común');
    expect(text).not.toContain('DÍA 2');
    expect(text).toContain('DÍA 3');
  });

  it('toTxt incluye el nombre de la grilla', () => {
    expect(toTxt('Mi grilla', pieces).startsWith('Mi grilla\n=========')).toBe(true);
  });

  it('toCsv escapa comillas, saltos y fórmulas, y lleva BOM', () => {
    const csv = toCsv(pieces);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Copy uno, con ""comillas""\ny salto"');
    expect(csv).toContain("'=SUMA(1)");
    expect(csv).toContain("'@mención");
    expect(csv).toContain('https://x/1.png | https://x/2.png');
    expect(csv.split('\r\n')[0].replace('﻿', '')).toBe('dia,tema,categoria,copy,imagenes');
  });

  it('toJson es JSON válido y conserva los datos', () => {
    const parsed = JSON.parse(toJson('G', pieces));
    expect(parsed.grid).toBe('G');
    expect(parsed.pieces).toHaveLength(3);
    expect(parsed.pieces[0].caption).toContain('comillas');
  });
});

describe('nombres de archivo', () => {
  const date = new Date('2026-10-16T12:00:00Z');
  it('quita tildes y símbolos', () => {
    expect(exportFileName('Semana Navideña: ¡Oferta!', 'txt', date)).toBe('semana-navidena-oferta-2026-10-16.txt');
  });
  it('usa un nombre por defecto si queda vacío', () => {
    expect(exportFileName('¡¡¡', '.csv', date)).toBe('grilla-2026-10-16.csv');
  });
  it('nombra las imágenes por día y slide', () => {
    expect(imageFileName('Grilla 1', 2, 3)).toMatch(/^grilla-1-dia-3-slide-3-\d{4}-\d{2}-\d{2}\.png$/);
  });
});
