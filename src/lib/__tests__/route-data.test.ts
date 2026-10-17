import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSwrCache } from '../swr-cache';
import { prefetchRouteData, ROUTE_DATA, WARM_URLS, warmCommonData } from '../route-data';

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

  it('warmCommonData pide solo unos pocos endpoints (máx. 4) y todos están registrados', async () => {
    warmCommonData();
    await Promise.resolve();
    expect(WARM_URLS.length).toBeLessThanOrEqual(4);
    expect(fetch).toHaveBeenCalledTimes(WARM_URLS.length);
    const registered = new Set(Object.values(ROUTE_DATA).flat());
    for (const u of WARM_URLS) expect(registered.has(u)).toBe(true);
  });

  it('todas las URLs son rutas /api/ relativas y sin duplicados dentro de un módulo', () => {
    for (const [href, urls] of Object.entries(ROUTE_DATA)) {
      expect(href.startsWith('/')).toBe(true);
      expect(new Set(urls).size).toBe(urls.length);
      for (const u of urls) expect(u.startsWith('/api/')).toBe(true);
    }
  });

  it('precarga datos compartidos de CRM y los módulos con caché', async () => {
    for (const href of ['/contactos', '/contenido-multimedia', '/pagos', '/automatizacion', '/agentes-ia', '/settings']) {
      prefetchRouteData(href);
    }
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledWith('/api/contacts', expect.anything());
    expect(fetch).toHaveBeenCalledWith('/api/media', expect.anything());
    expect(fetch).toHaveBeenCalledWith('/api/payments?limit=300', expect.anything());
    expect(fetch).toHaveBeenCalledWith('/api/automations/runs?limit=50', expect.anything());
    expect(fetch).toHaveBeenCalledWith('/api/settings', expect.anything());
  });
});
