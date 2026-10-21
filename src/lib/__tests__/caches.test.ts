import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TtlCache } from '../ttl-cache';
import { fetchJson, getCached, invalidate, isFresh, prefetchJson, resetSwrCache, setCached, subscribe } from '../swr-cache';

describe('TtlCache', () => {
  it('devuelve el valor hasta que caduca', () => {
    let t = 1000;
    const c = new TtlCache<number>(100, 10, () => t);
    c.set('a', 1);
    expect(c.get('a')).toBe(1);
    t += 99;
    expect(c.get('a')).toBe(1);
    t += 2;
    expect(c.get('a')).toBeUndefined();
  });

  it('expulsa lo más antiguo al llegar al máximo', () => {
    const c = new TtlCache<number>(1000, 2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    expect(c.get('a')).toBeUndefined();
    expect(c.get('c')).toBe(3);
  });

  it('no repite el cálculo si hay uno en curso', async () => {
    const c = new TtlCache<number>(1000);
    const compute = vi.fn(async () => 7);
    const [x, y] = await Promise.all([c.getOrCompute('k', compute), c.getOrCompute('k', compute)]);
    expect([x, y]).toEqual([7, 7]);
    expect(compute).toHaveBeenCalledTimes(1);
    await c.getOrCompute('k', compute);
    expect(compute).toHaveBeenCalledTimes(1);
  });
});

const ok = (data: unknown) => async () => new Response(JSON.stringify(data), { status: 200 });

describe('swr-cache', () => {
  beforeEach(() => resetSwrCache());

  it('guarda lo pedido y lo deja disponible', async () => {
    const data = await fetchJson<{ n: number }>('/x', ok({ n: 1 }));
    expect(data.n).toBe(1);
    expect(getCached<{ n: number }>('/x')?.data.n).toBe(1);
    expect(isFresh('/x', 1000)).toBe(true);
  });

  it('comparte una sola llamada entre peticiones simultáneas', async () => {
    const fetcher = vi.fn(ok({ n: 1 }));
    await Promise.all([fetchJson('/y', fetcher), fetchJson('/y', fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rechaza respuestas con error y no cachea', async () => {
    const bad = async () => new Response('{}', { status: 500 });
    await expect(fetchJson('/z', bad)).rejects.toThrow('HTTP 500');
    expect(getCached('/z')).toBeUndefined();
  });

  it('prefetch no repite si el dato es reciente', async () => {
    const fetcher = vi.fn(ok({ n: 1 }));
    prefetchJson('/p', 20_000, fetcher);
    await new Promise((r) => setTimeout(r, 0));
    prefetchJson('/p', 20_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('avisa a los suscriptores y permite invalidar por prefijo', () => {
    const cb = vi.fn();
    const off = subscribe('/api/a', cb);
    setCached('/api/a', 1);
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    setCached('/api/a', 2);
    expect(cb).toHaveBeenCalledTimes(1);
    invalidate('/api/');
    expect(getCached('/api/a')).toBeUndefined();
  });
});
