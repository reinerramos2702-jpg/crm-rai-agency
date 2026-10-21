import { describe, expect, it } from 'vitest';
import { SIGNATURE_TOLERANCE_MS, secretsEqual, signRetellBody, verifyRetellSignature } from '../signature';

const SECRET = 'key_test_0123456789abcdef';
const BODY = JSON.stringify({ event: 'call_ended', call: { call_id: 'call_1' } });
const NOW = 1_800_000_000_000;

describe('verifyRetellSignature', () => {
  it('acepta una firma válida', () => {
    expect(verifyRetellSignature(BODY, SECRET, signRetellBody(BODY, SECRET, NOW), NOW + 1000)).toBe(true);
  });

  it('rechaza una firma con el digest alterado', () => {
    const header = signRetellBody(BODY, SECRET, NOW);
    const bad = header.slice(0, -1) + (header.endsWith('0') ? '1' : '0');
    expect(verifyRetellSignature(BODY, SECRET, bad, NOW)).toBe(false);
  });

  it('rechaza si el cuerpo fue modificado (se firma el cuerpo crudo)', () => {
    const header = signRetellBody(BODY, SECRET, NOW);
    expect(verifyRetellSignature(BODY.replace('call_1', 'call_2'), SECRET, header, NOW)).toBe(false);
    expect(verifyRetellSignature(JSON.stringify(JSON.parse(BODY), null, 2), SECRET, header, NOW)).toBe(false);
  });

  it('rechaza con otra llave', () => {
    expect(verifyRetellSignature(BODY, 'otra-llave', signRetellBody(BODY, SECRET, NOW), NOW)).toBe(false);
  });

  it('rechaza una marca de tiempo fuera de la ventana de 5 minutos (anti-repetición)', () => {
    const header = signRetellBody(BODY, SECRET, NOW);
    expect(verifyRetellSignature(BODY, SECRET, header, NOW + SIGNATURE_TOLERANCE_MS + 1)).toBe(false);
    expect(verifyRetellSignature(BODY, SECRET, header, NOW - SIGNATURE_TOLERANCE_MS - 1)).toBe(false);
    expect(verifyRetellSignature(BODY, SECRET, header, NOW + SIGNATURE_TOLERANCE_MS)).toBe(true);
  });

  it('rechaza cabeceras ausentes o mal formadas y secretos vacíos', () => {
    expect(verifyRetellSignature(BODY, SECRET, null, NOW)).toBe(false);
    expect(verifyRetellSignature(BODY, SECRET, '', NOW)).toBe(false);
    expect(verifyRetellSignature(BODY, SECRET, 'v=abc,d=zz', NOW)).toBe(false);
    expect(verifyRetellSignature(BODY, SECRET, `v=${NOW}`, NOW)).toBe(false);
    expect(verifyRetellSignature(BODY, null, signRetellBody(BODY, SECRET, NOW), NOW)).toBe(false);
    expect(verifyRetellSignature(BODY, '', signRetellBody(BODY, SECRET, NOW), NOW)).toBe(false);
  });
});

describe('secretsEqual', () => {
  it('compara en tiempo constante y rechaza vacíos', () => {
    expect(secretsEqual('abc', 'abc')).toBe(true);
    expect(secretsEqual('abc', 'abd')).toBe(false);
    expect(secretsEqual('abc', 'abcd')).toBe(false);
    expect(secretsEqual('', '')).toBe(false);
    expect(secretsEqual(null, 'abc')).toBe(false);
  });
});
