import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSwrCache } from '../swr-cache';
import { prefetchRouteData, ROUTE_DATA, warmCommonData } from '../route-data';

describe('route-data', () => {
  beforeEach(() => {
    resetSwrCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
  });

  it('precarga los datos del módulo conocido una sola vez', async () => {
    prefetchRouteData('/launchpad');
    prefetchRouteData('/launchpad');
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(ROUTE_DATA['/launchpad'].length);
  });

  it('ignora rutas sin datos registrados', () => {
    prefetchRouteData('/ruta-desconocida');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('warmCommonData pide todos los endpoints registrados', async () => {
    warmCommonData();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(Object.values(ROUTE_DATA).flat().length);
  });
});
