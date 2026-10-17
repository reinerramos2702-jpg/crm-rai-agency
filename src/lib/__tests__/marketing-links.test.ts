import { describe, expect, it } from 'vitest';
import { buildUtmUrl, hostOf, normalizeDestination, parseUrlList, publicLinkUrl, sanitizeSlug, sortLinks, totalClicks } from '../marketing-links';

describe('marketing-links', () => {
  it('normaliza destinos y rechaza esquemas peligrosos', () => {
    expect(normalizeDestination('tuempresa.com/oferta')).toEqual({ ok: true, url: 'https://tuempresa.com/oferta' });
    expect(normalizeDestination('http://a.co')).toMatchObject({ ok: true });
    expect(normalizeDestination('javascript:alert(1)').ok).toBe(false);
    expect(normalizeDestination('ftp://a.com').ok).toBe(false);
    expect(normalizeDestination('').ok).toBe(false);
    expect(normalizeDestination('solopalabra').ok).toBe(false);
    expect(normalizeDestination('localhost:3000')).toMatchObject({ ok: true });
  });
  it('limpia el slug como el API', () => {
    expect(sanitizeSlug('  Oferta Verano!! ')).toBe('oferta-verano');
    expect(sanitizeSlug('Año--Nuevo')).toBe('ano-nuevo');
    expect(sanitizeSlug('x'.repeat(80))).toHaveLength(40);
  });
  it('arma la URL pública', () => {
    expect(publicLinkUrl('https://crm.ejemplo.com/', 'abc')).toBe('https://crm.ejemplo.com/go/abc');
  });
  it('suma clics y ordena', () => {
    const l = [
      { id: '1', label: 'a', slug: 'a', destination: 'x', clicks: 3, createdAt: '2026-01-01' },
      { id: '2', label: 'b', slug: 'b', destination: 'y', clicks: 9, createdAt: '2026-02-01' },
    ];
    expect(totalClicks(l)).toBe(12);
    expect(sortLinks(l, 'clicks')[0].id).toBe('2');
    expect(sortLinks(l, 'recent')[0].id).toBe('2');
    expect(l[0].id).toBe('1');
  });
  it('host legible', () => {
    expect(hostOf('https://www.tuempresa.com/x')).toBe('tuempresa.com');
  });
  it('construye UTM conservando parámetros previos', () => {
    const r = buildUtmUrl({ url: 'tuempresa.com/p?ref=1', source: 'Facebook', medium: 'paid social', campaign: 'Black Friday' });
    expect(r.ok && r.url).toBe('https://tuempresa.com/p?ref=1&utm_source=facebook&utm_medium=paid_social&utm_campaign=black_friday');
    expect(buildUtmUrl({ url: 'a.com', source: '', medium: 'x', campaign: 'y' }).ok).toBe(false);
    expect(buildUtmUrl({ url: 'nope', source: 'a', medium: 'b', campaign: 'c' }).ok).toBe(false);
  });
  it('lee listas de direcciones', () => {
    const r = parseUrlList('a.com\nhttps://a.com/, b.com; mal formato \n javascript:x', 5);
    expect(r.urls).toEqual(['https://a.com/', 'https://b.com/']);
    expect(r.invalid).toHaveLength(2);
    expect(parseUrlList('a.com,b.com,c.com', 2)).toMatchObject({ tooMany: true });
    expect(parseUrlList('a.com,b.com,c.com', 2).urls).toHaveLength(2);
  });
});
