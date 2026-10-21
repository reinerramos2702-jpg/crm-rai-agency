import { describe, expect, it } from 'vitest';
import {
  MAX_BATCH,
  canTransition,
  getPublishMode,
  isIsoDate,
  isMissingTableError,
  isPublicHttpsUrl,
  retryDelayMs,
  safeError,
  sanitizeBatch,
  zonedToUtc,
} from '../scheduled-posts';

const now = new Date('2026-10-15T12:00:00Z');
const base = { now, requireMedia: false, defaultTime: '09:00', defaultTimezone: 'America/Caracas' };
const post = (o: Record<string, unknown> = {}) => ({ day: 1, date: '2026-10-20', caption: 'Hola', ...o });

describe('zonedToUtc', () => {
  it('Caracas (UTC-4) 09:00 → 13:00Z', () => {
    expect(zonedToUtc('2026-10-20', '09:00', 'America/Caracas').toISOString()).toBe('2026-10-20T13:00:00.000Z');
  });
  it('UTC es identidad', () => {
    expect(zonedToUtc('2026-10-20', '23:30', 'UTC').toISOString()).toBe('2026-10-20T23:30:00.000Z');
  });
  it('respeta horario de verano (Madrid julio UTC+2, enero UTC+1)', () => {
    expect(zonedToUtc('2026-07-01', '10:00', 'Europe/Madrid').toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(zonedToUtc('2026-01-15', '10:00', 'Europe/Madrid').toISOString()).toBe('2026-01-15T09:00:00.000Z');
  });
});

describe('validadores', () => {
  it('isIsoDate rechaza fechas imposibles', () => {
    expect(isIsoDate('2026-10-20')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('20-10-2026')).toBe(false);
    expect(isIsoDate(5)).toBe(false);
  });
  it('isPublicHttpsUrl solo https público (anti-SSRF)', () => {
    expect(isPublicHttpsUrl('https://cdn.ejemplo.com/a.jpg')).toBe(true);
    expect(isPublicHttpsUrl('http://cdn.ejemplo.com/a.jpg')).toBe(false);
    expect(isPublicHttpsUrl('https://localhost/a.jpg')).toBe(false);
    expect(isPublicHttpsUrl('https://127.0.0.1/a.jpg')).toBe(false);
    expect(isPublicHttpsUrl('https://10.0.0.5/a.jpg')).toBe(false);
    expect(isPublicHttpsUrl('https://192.168.1.2/a.jpg')).toBe(false);
    expect(isPublicHttpsUrl('https://169.254.169.254/latest')).toBe(false);
    expect(isPublicHttpsUrl('https://[::1]/a.jpg')).toBe(false);
    expect(isPublicHttpsUrl('javascript:alert(1)')).toBe(false);
  });
  it('getPublishMode: simulado salvo IG_PUBLISH_MODE=live', () => {
    expect(getPublishMode({})).toBe('simulated');
    expect(getPublishMode({ IG_PUBLISH_MODE: 'LIVE' })).toBe('simulated');
    expect(getPublishMode({ IG_PUBLISH_MODE: 'live' })).toBe('live');
  });
});

describe('sanitizeBatch', () => {
  it('lote válido usa hora/zona por defecto', () => {
    const r = sanitizeBatch({ campaignRef: 'c1', posts: [post()] }, base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.posts[0].scheduledAt.toISOString()).toBe('2026-10-20T13:00:00.000Z');
      expect(r.timezone).toBe('America/Caracas');
    }
  });
  it('rechaza sin campaignRef, vacío, hora o zona inválida y lote gigante', () => {
    expect(sanitizeBatch({ posts: [post()] }, base).ok).toBe(false);
    expect(sanitizeBatch({ campaignRef: 'c', posts: [] }, base).ok).toBe(false);
    expect(sanitizeBatch({ campaignRef: 'c', time: '25:00', posts: [post()] }, base).ok).toBe(false);
    expect(sanitizeBatch({ campaignRef: 'c', timezone: 'Mars/X', posts: [post()] }, base).ok).toBe(false);
    const many = Array.from({ length: MAX_BATCH + 1 }, (_, i) => post({ day: i + 1 }));
    expect(sanitizeBatch({ campaignRef: 'c', posts: many }, base).ok).toBe(false);
  });
  it('omite (no aborta) los inválidos y explica por qué', () => {
    const r = sanitizeBatch(
      { campaignRef: 'c', posts: [post(), post({ day: 2, caption: '' }), post({ day: 3, date: '2026-10-01' }), post({ day: 1 })] },
      base,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.posts.map((p) => p.dayNumber)).toEqual([1]);
      expect(r.skipped.map((s) => s.day)).toEqual([2, 3, 1]);
    }
  });
  it('modo live exige imágenes; simulado no', () => {
    expect(sanitizeBatch({ campaignRef: 'c', posts: [post()] }, { ...base, requireMedia: true }).ok).toBe(false);
    const ok = sanitizeBatch({ campaignRef: 'c', posts: [post({ mediaUrls: ['https://x.com/a.jpg'] })] }, { ...base, requireMedia: true });
    expect(ok.ok).toBe(true);
  });
  it('carrusel: >1 imagen lo marca carrusel; 1 sola con tipo carrusel se omite; >10 se omite', () => {
    const urls = (n: number) => Array.from({ length: n }, (_, i) => `https://x.com/${i}.jpg`);
    const r = sanitizeBatch({ campaignRef: 'c', posts: [post({ mediaUrls: urls(3) })] }, base);
    expect(r.ok && r.posts[0].mediaType).toBe('carousel');
    expect(sanitizeBatch({ campaignRef: 'c', posts: [post({ mediaType: 'carousel', mediaUrls: urls(1) })] }, base).ok).toBe(false);
    expect(sanitizeBatch({ campaignRef: 'c', posts: [post({ mediaUrls: urls(11) })] }, base).ok).toBe(false);
  });
  it('rechaza URL no pública dentro del lote', () => {
    expect(sanitizeBatch({ campaignRef: 'c', posts: [post({ mediaUrls: ['http://x.com/a.jpg'] })] }, base).ok).toBe(false);
  });
});

describe('estados, reintentos y errores', () => {
  it('transiciones permitidas', () => {
    expect(canTransition('scheduled', 'publishing')).toBe(true);
    expect(canTransition('published', 'scheduled')).toBe(false);
    expect(canTransition('failed', 'scheduled')).toBe(true);
    expect(canTransition('draft', 'published')).toBe(false);
  });
  it('espera creciente', () => {
    expect(retryDelayMs(1)).toBe(5 * 60_000);
    expect(retryDelayMs(2)).toBe(15 * 60_000);
    expect(retryDelayMs(3)).toBe(45 * 60_000);
  });
  it('safeError oculta tokens', () => {
    expect(safeError(new Error('fallo ?access_token=EAABsbCS1234567890abcdefXYZ&x=1'))).not.toContain('EAABsbCS');
  });
});

describe('isMissingTableError', () => {
  it('detecta tabla o columna inexistente de Prisma', () => {
    expect(isMissingTableError({ code: 'P2021' })).toBe(true);
    expect(isMissingTableError({ code: 'P2022' })).toBe(true);
  });
  it('ignora otros errores', () => {
    expect(isMissingTableError({ code: 'P2002' })).toBe(false);
    expect(isMissingTableError(new Error('x'))).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
  });
});
