import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';

describe('password.ts — hash scrypt nativo (Etapa 3)', () => {
  it('hash + verify roundtrip con el password correcto', () => {
    const hash = hashPassword('mi-password-segura-123');
    expect(hash.startsWith('scrypt:')).toBe(true);
    expect(verifyPassword('mi-password-segura-123', hash)).toBe(true);
  });

  it('password incorrecto → false', () => {
    const hash = hashPassword('correcto');
    expect(verifyPassword('incorrecto', hash)).toBe(false);
  });

  it('dos hashes del mismo password son distintos (salt aleatorio)', () => {
    expect(hashPassword('mismo')).not.toBe(hashPassword('mismo'));
  });

  it('hash con formato inválido → false (fail-closed, nunca lanza)', () => {
    expect(verifyPassword('x', '')).toBe(false);
    expect(verifyPassword('x', 'bcrypt:algo')).toBe(false);
    expect(verifyPassword('x', 'scrypt:salt')).toBe(false);
    expect(verifyPassword('x', 'scrypt:salt:zzz')).toBe(false);
  });
});