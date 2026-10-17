import { describe, expect, it } from 'vitest';
import { escapeCsvCell, parseCsv, toCsv, detectDelimiter } from './crm-csv';
import { clampPage, pageCount, rangeLabel, sliceFor } from './crm-paging';
import { prune, selectionState, setMany, toggleId } from './crm-selection';
import { avatarTone, formatMoney, initials, isEmail, normalize, parseAmount, plural } from './crm-text';
import { formatDate, formatDateTime, formatUtcOffset, relativeTime, toDate } from './crm-time';

describe('formatUtcOffset', () => {
  it('muestra el signo menos tipográfico y omite minutos cero', () => {
    expect(formatUtcOffset(-240)).toBe('UTC−4');
    expect(formatUtcOffset(60)).toBe('UTC+1');
    expect(formatUtcOffset(330)).toBe('UTC+5:30');
    expect(formatUtcOffset(0)).toBe('UTC');
    expect(formatUtcOffset(Number.NaN)).toBe('UTC');
  });
});

describe('fechas', () => {
  it('toDate rechaza valores vacíos o inválidos', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate('')).toBeNull();
    expect(toDate('no-fecha')).toBeNull();
    expect(toDate('2026-10-17T12:00:00Z')?.getUTCFullYear()).toBe(2026);
  });
  it('formatea con zona explícita y usa guion si falta', () => {
    expect(formatDate('2026-10-17T12:00:00Z', { timeZone: 'UTC' })).toContain('2026');
    expect(formatDateTime('2026-10-17T14:05:00Z', { timeZone: 'UTC' })).toContain('14:05');
    expect(formatDateTime(undefined)).toBe('—');
  });
  it('relativeTime escala de minutos a días', () => {
    const now = new Date('2026-10-17T12:00:00Z');
    expect(relativeTime('2026-10-17T11:59:40Z', now)).toBe('justo ahora');
    expect(relativeTime('2026-10-17T11:55:00Z', now)).toBe('hace 5 min');
    expect(relativeTime('2026-10-17T09:00:00Z', now)).toBe('hace 3 h');
    expect(relativeTime('2026-10-16T09:00:00Z', now)).toBe('ayer');
    expect(relativeTime('2026-10-13T12:00:00Z', now)).toBe('hace 4 d');
    expect(relativeTime(null, now)).toBe('—');
  });
});

describe('texto', () => {
  it('normaliza tildes y mayúsculas', () => {
    expect(normalize('  María Pérez ')).toBe('maria perez');
  });
  it('iniciales', () => {
    expect(initials('ana')).toBe('A');
    expect(initials('Ana María Pérez')).toBe('AP');
    expect(initials('   ')).toBe('?');
  });
  it('plural', () => {
    expect(plural(1, 'contacto', 'contactos')).toBe('1 contacto');
    expect(plural(0, 'contacto', 'contactos')).toBe('0 contactos');
  });
  it('avatarTone es estable y está en rango', () => {
    expect(avatarTone('Ana')).toBe(avatarTone('Ana'));
    for (const n of ['a', 'Reiner', 'Hotel MPV', '']) {
      const t = avatarTone(n);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(6);
    }
  });
  it('formatMoney incluye moneda y decimales', () => {
    expect(formatMoney(0)).toContain('0,00');
    expect(formatMoney(12.5)).toContain('12,50');
    expect(formatMoney(Number.NaN)).toContain('0,00');
  });
  it('parseAmount entiende formatos habituales', () => {
    expect(parseAmount('50')).toBe(50);
    expect(parseAmount('€ 1.234,50')).toBe(1234.5);
    expect(parseAmount('1,234.50')).toBe(1234.5);
    expect(parseAmount('1.234')).toBe(1234);
    expect(parseAmount('12,5')).toBe(12.5);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
  it('isEmail', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('a b@c.com')).toBe(false);
    expect(isEmail('@c.com')).toBe(false);
    expect(isEmail('a@@c.com')).toBe(false);
  });
});

describe('csv', () => {
  it('detecta el separador', () => {
    expect(detectDelimiter('a;b;c')).toBe(';');
    expect(detectDelimiter('a\tb')).toBe('\t');
    expect(detectDelimiter('a,b')).toBe(',');
  });
  it('analiza comillas, saltos y BOM', () => {
    const rows = parseCsv('﻿nombre,nota\r\n"Pérez, Ana","dijo ""hola""\nadiós"\r\n\r\nLuis,ok');
    expect(rows).toEqual([['nombre', 'nota'], ['Pérez, Ana', 'dijo "hola"\nadiós'], ['Luis', 'ok']]);
  });
  it('soporta punto y coma', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('neutraliza fórmulas pero respeta teléfonos', () => {
    expect(escapeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
    expect(escapeCsvCell('+58 412-1234567')).toBe('+58 412-1234567');
    expect(escapeCsvCell('-cmd|x')).toBe("'-cmd|x");
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('di "x"')).toBe('"di ""x"""');
  });
  it('toCsv une filas con CRLF', () => {
    expect(toCsv([['a', 'b,c'], ['1', '2']])).toBe('a,"b,c"\r\n1,2');
  });
});

describe('paginación', () => {
  it('cuenta y acota páginas', () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(41, 20)).toBe(3);
    expect(clampPage(9, 41, 20)).toBe(3);
    expect(clampPage(0, 41, 20)).toBe(1);
  });
  it('corta y rotula', () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    expect(sliceFor(items, 3, 20)).toHaveLength(5);
    expect(rangeLabel(45, 3, 20)).toBe('41–45 de 45');
    expect(rangeLabel(0, 1, 20)).toBe('0 resultados');
  });
});

describe('selección', () => {
  it('alterna y calcula el estado', () => {
    const a = toggleId(new Set(), 'x');
    expect(a.has('x')).toBe(true);
    expect(toggleId(a, 'x').has('x')).toBe(false);
    expect(selectionState(a, ['x', 'y'])).toBe('some');
    expect(selectionState(setMany(a, ['x', 'y'], true), ['x', 'y'])).toBe('all');
    expect(selectionState(new Set(), ['x'])).toBe('none');
    expect(selectionState(a, [])).toBe('none');
  });
  it('setMany desmarca solo los visibles y prune descarta ids huérfanos', () => {
    const s = new Set(['a', 'b', 'z']);
    expect(Array.from(setMany(s, ['a', 'b'], false))).toEqual(['z']);
    expect(Array.from(prune(s, ['a', 'z'])).sort()).toEqual(['a', 'z']);
  });
});
