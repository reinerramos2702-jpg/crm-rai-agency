import { describe, expect, it } from 'vitest';
import { digitsOnly, isValidEmail, normalizeDestination, parseMinutes, validateNewContact } from './conv-forms';

describe('validateNewContact', () => {
  it('exige nombre', () => {
    expect(validateNewContact({ name: ' ', email: '', phoneLocal: '' }).name).toBeDefined();
  });
  it('acepta datos válidos y opcionales vacíos', () => {
    expect(validateNewContact({ name: 'Ana', email: '', phoneLocal: '' })).toEqual({});
    expect(validateNewContact({ name: 'Ana', email: 'ana@correo.com', phoneLocal: '4242265547' })).toEqual({});
  });
  it('rechaza correo y teléfono inválidos', () => {
    const errors = validateNewContact({ name: 'Ana', email: 'ana@', phoneLocal: '123' });
    expect(errors.email).toBeDefined();
    expect(errors.phoneLocal).toBeDefined();
  });
  it('limita el nombre a 120 caracteres', () => {
    expect(validateNewContact({ name: 'a'.repeat(121), email: '', phoneLocal: '' }).name).toBeDefined();
  });
});

describe('correo y teléfono', () => {
  it('valida correos', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a b@c.co')).toBe(false);
    expect(isValidEmail('sin-arroba.com')).toBe(false);
  });
  it('deja solo dígitos y corta a 15', () => {
    expect(digitsOnly('+58 (424) 226-5547')).toBe('584242265547');
    expect(digitsOnly('1'.repeat(30))).toHaveLength(15);
  });
});

describe('normalizeDestination', () => {
  it('añade https cuando falta el esquema', () => {
    expect(normalizeDestination('tuweb.com/oferta')).toBe('https://tuweb.com/oferta');
  });
  it('conserva http y https', () => {
    expect(normalizeDestination('http://tuweb.com')).toBe('http://tuweb.com/');
    expect(normalizeDestination(' https://tuweb.com/a?b=1 ')).toBe('https://tuweb.com/a?b=1');
  });
  it('bloquea esquemas peligrosos y basura', () => {
    expect(normalizeDestination('javascript:alert(1)')).toBeNull();
    expect(normalizeDestination('data:text/html;base64,AAAA')).toBeNull();
    expect(normalizeDestination('ftp://tuweb.com')).toBeNull();
    expect(normalizeDestination('hola mundo')).toBeNull();
    expect(normalizeDestination('localhost')).toBeNull();
    expect(normalizeDestination('')).toBeNull();
  });
});

describe('parseMinutes', () => {
  it('vacío significa sin límite', () => {
    expect(parseMinutes('')).toEqual({ ok: true, value: null });
  });
  it('acepta enteros entre 1 y 10 080', () => {
    expect(parseMinutes('30')).toEqual({ ok: true, value: 30 });
    expect(parseMinutes('10080')).toEqual({ ok: true, value: 10080 });
  });
  it('rechaza cero, negativos, decimales y exceso', () => {
    for (const v of ['0', '-5', '1.5', '10081', 'abc', '1e3']) expect(parseMinutes(v)).toEqual({ ok: false });
  });
});
