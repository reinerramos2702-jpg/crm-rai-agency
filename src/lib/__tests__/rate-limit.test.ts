import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimits } from '@/lib/rate-limit';

describe('rate-limit.ts — ventana fija en memoria (Etapa 3)', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('permite hasta max intentos en la ventana', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('k', { max: 5, windowMs: 60000 }).ok).toBe(true);
    }
  });

  it('bloquea el intento que supera max y reporta retryAfterSec', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('k', { max: 5, windowMs: 60000 });
    const r = checkRateLimit('k', { max: 5, windowMs: 60000 });
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
    expect(r.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it('claves distintas no comparten contador', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('a', { max: 5, windowMs: 60000 });
    expect(checkRateLimit('b', { max: 5, windowMs: 60000 }).ok).toBe(true);
  });

  it('ventana expirada → el contador se reinicia', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('k', { max: 5, windowMs: -1 });
    // windowMs negativo → resetAt ya pasó → cuenta de nuevo desde 1
    expect(checkRateLimit('k', { max: 5, windowMs: -1 }).ok).toBe(true);
  });
});