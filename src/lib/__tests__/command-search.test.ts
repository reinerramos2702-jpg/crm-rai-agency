import { describe, expect, it } from 'vitest';
import { normalizeText, rankItems, scoreMatch } from '../command-search';

describe('normalizeText', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(normalizeText('  Reputación ')).toBe('reputacion');
  });
});

describe('scoreMatch', () => {
  it('prioriza exacto > prefijo > inicio de palabra > contenido > subsecuencia', () => {
    const exact = scoreMatch('pagos', 'Pagos');
    const prefix = scoreMatch('pag', 'Pagos');
    const word = scoreMatch('ima', 'Generador Imágenes');
    const inside = scoreMatch('ago', 'Pagos');
    const subseq = scoreMatch('pgs', 'Pagos');
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(subseq);
    expect(subseq).toBeGreaterThan(0);
  });

  it('ignora tildes en la consulta y en el texto', () => {
    expect(scoreMatch('reputacion', 'Reputación')).toBeGreaterThan(0);
    expect(scoreMatch('Reputación', 'reputacion')).toBeGreaterThan(0);
  });

  it('exige que todos los términos coincidan', () => {
    expect(scoreMatch('nueva campana', 'Nueva Campaña')).toBeGreaterThan(0);
    expect(scoreMatch('nueva pagos', 'Nueva Campaña')).toBe(0);
  });

  it('devuelve 0 sin coincidencia y 1 con consulta vacía', () => {
    expect(scoreMatch('zzz', 'Contactos')).toBe(0);
    expect(scoreMatch('   ', 'Contactos')).toBe(1);
  });
});

describe('rankItems', () => {
  const items = ['Contactos', 'Conversaciones', 'Calendarios', 'Configuración'];

  it('devuelve todo y en orden con consulta vacía', () => {
    expect(rankItems(items, '', (x) => x)).toEqual(items);
  });

  it('filtra y ordena por relevancia', () => {
    expect(rankItems(items, 'conv', (x) => x)[0]).toBe('Conversaciones');
    expect(rankItems(items, 'conf', (x) => x)).toEqual(['Configuración']);
  });

  it('conserva el orden original a igualdad de puntaje', () => {
    // Los tres con prefijo «co» empatan y mantienen su orden; «Calendarios» (subsecuencia) va después.
    expect(rankItems(items, 'co', (x) => x)).toEqual(['Contactos', 'Conversaciones', 'Configuración', 'Calendarios']);
  });
});
