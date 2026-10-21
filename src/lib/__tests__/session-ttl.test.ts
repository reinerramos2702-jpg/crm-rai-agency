import { describe, it, expect, beforeAll } from 'vitest';
import { decodeJwt } from 'jose';
import { signJwt } from '@/lib/auth';
import { sessionTtlSec, SESSION_TTL_REMEMBER_SEC, SESSION_TTL_SHORT_SEC } from '@/lib/session-ttl';

describe('duración de sesión (Mantener sesión iniciada)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-'.padEnd(40, 'x');
  });

  it('sessionTtlSec: true → 30 días, false → 12 h', () => {
    expect(sessionTtlSec(true)).toBe(SESSION_TTL_REMEMBER_SEC);
    expect(sessionTtlSec(false)).toBe(SESSION_TTL_SHORT_SEC);
    expect(SESSION_TTL_REMEMBER_SEC).toBe(60 * 60 * 24 * 30);
    expect(SESSION_TTL_SHORT_SEC).toBe(60 * 60 * 12);
  });

  it('signJwt respeta expiresInSec y conserva 7 días por defecto', async () => {
    const now = Math.floor(Date.now() / 1000);
    const long = decodeJwt(await signJwt({ userId: 'u', email: 'a@b.c', expiresInSec: SESSION_TTL_REMEMBER_SEC }));
    const short = decodeJwt(await signJwt({ userId: 'u', email: 'a@b.c', expiresInSec: SESSION_TTL_SHORT_SEC }));
    const def = decodeJwt(await signJwt({ userId: 'u', email: 'a@b.c' }));
    expect(Math.abs((long.exp as number) - now - SESSION_TTL_REMEMBER_SEC)).toBeLessThan(5);
    expect(Math.abs((short.exp as number) - now - SESSION_TTL_SHORT_SEC)).toBeLessThan(5);
    expect(Math.abs((def.exp as number) - now - 60 * 60 * 24 * 7)).toBeLessThan(5);
  });
});
