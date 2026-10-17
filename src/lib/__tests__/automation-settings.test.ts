import { describe, expect, it } from 'vitest';
import { checkNotifyEmail } from '../automation-settings';

describe('checkNotifyEmail', () => {
  it('vacío significa quitar el correo', () => {
    expect(checkNotifyEmail('   ')).toEqual({ ok: true, value: null });
  });
  it('recorta y pasa a minúsculas', () => {
    expect(checkNotifyEmail('  Gerencia@Empresa.COM ')).toEqual({ ok: true, value: 'gerencia@empresa.com' });
  });
  it('rechaza formatos inválidos y varias direcciones', () => {
    for (const bad of ['sin-arroba', 'a@b', 'a@b.c', '@x.com', 'a b@x.com']) {
      expect(checkNotifyEmail(bad).ok).toBe(false);
    }
    const multi = checkNotifyEmail('a@x.com, b@x.com');
    expect(multi.ok).toBe(false);
    expect(!multi.ok && multi.error).toContain('una sola');
  });
  it('rechaza correos demasiado largos', () => {
    expect(checkNotifyEmail(`${'a'.repeat(250)}@x.com`).ok).toBe(false);
  });
});
