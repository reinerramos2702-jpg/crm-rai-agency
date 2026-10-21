import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ROLE_CONTEXT_TTL_MS,
  getCachedRoleContext,
  invalidateRoleContext,
  loadRoleContext,
  resetRoleContextCache,
  roleContextKey,
  setCachedRoleContext,
  type CachedRoleContext,
} from '../role-context-cache';

const WS = { id: 'ws-1', name: 'WS', ownerId: 'owner-1' };
const admin: CachedRoleContext = { workspace: WS, role: 'admin' };

describe('role-context-cache', () => {
  beforeEach(() => {
    resetRoleContextCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('TTL máximo de 5 s (requisito de seguridad)', () => {
    expect(ROLE_CONTEXT_TTL_MS).toBeLessThanOrEqual(5_000);
  });

  it('hit: la segunda lectura no vuelve a ejecutar el loader', async () => {
    const key = roleContextKey('u1', 'a@x.com', '');
    const loader = vi.fn().mockResolvedValue(admin);
    await loadRoleContext(key, loader);
    const again = await loadRoleContext(key, loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(again).toEqual(admin);
  });

  it('expiración: pasado el TTL se vuelve a consultar (el cambio de rol se ve en ≤5 s)', async () => {
    const key = roleContextKey('u1', 'a@x.com', '');
    const loader = vi.fn().mockResolvedValueOnce(admin).mockResolvedValueOnce({ workspace: WS, role: 'staff' });
    expect((await loadRoleContext(key, loader))?.role).toBe('admin');
    vi.advanceTimersByTime(ROLE_CONTEXT_TTL_MS - 1);
    expect((await loadRoleContext(key, loader))?.role).toBe('admin'); // aún vigente
    vi.advanceTimersByTime(2);
    expect((await loadRoleContext(key, loader))?.role).toBe('staff'); // caducó
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('el TTL no es deslizante: leer no lo prolonga', async () => {
    const key = roleContextKey('u1', 'a@x.com', '');
    const loader = vi.fn().mockResolvedValue(admin);
    await loadRoleContext(key, loader);
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(1_500);
      await loadRoleContext(key, loader);
    }
    // t=1.5/3/4.5 s: hit; t=6 s: caducó aunque se haya leído sin parar → 2 consultas en total
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('no cachea resultados negativos (null = sin acceso al workspace)', async () => {
    const key = roleContextKey('u1', 'a@x.com', 'ws-ajeno');
    const loader = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(admin);
    expect(await loadRoleContext(key, loader)).toBeNull();
    expect(getCachedRoleContext(key)).toBeUndefined();
    expect((await loadRoleContext(key, loader))?.role).toBe('admin'); // se concedió: se ve al instante
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('no cachea el rol mínimo viewer (fallback sin membresía)', async () => {
    const key = roleContextKey('u1', 'a@x.com', '');
    const loader = vi.fn().mockResolvedValue({ workspace: WS, role: 'viewer' });
    await loadRoleContext(key, loader);
    await loadRoleContext(key, loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(setCachedRoleContext(key, { workspace: WS, role: 'viewer' })).toBe(false);
  });

  it('no propaga los errores del loader a la caché y permite reintentar', async () => {
    const key = roleContextKey('u1', 'a@x.com', '');
    const loader = vi.fn().mockRejectedValueOnce(new Error('db caída')).mockResolvedValueOnce(admin);
    await expect(loadRoleContext(key, loader)).rejects.toThrow('db caída');
    expect((await loadRoleContext(key, loader))?.role).toBe('admin');
  });

  it('invalidación: invalidateRoleContext(userId) borra todas las claves de ese usuario y solo ese', async () => {
    const k1 = roleContextKey('u1', 'a@x.com', '');
    const k2 = roleContextKey('u1', 'a@x.com', 'ws-2');
    const k3 = roleContextKey('u2', 'b@x.com', '');
    for (const k of [k1, k2, k3]) await loadRoleContext(k, async () => admin);
    invalidateRoleContext('u1');
    expect(getCachedRoleContext(k1)).toBeUndefined();
    expect(getCachedRoleContext(k2)).toBeUndefined();
    expect(getCachedRoleContext(k3)).toBeDefined();
  });

  it('invalidación sin argumento vacía todo', async () => {
    const k = roleContextKey('u1', 'a@x.com', '');
    await loadRoleContext(k, async () => admin);
    invalidateRoleContext();
    expect(getCachedRoleContext(k)).toBeUndefined();
  });

  it('un prefijo de userId no invalida a otro usuario (u1 vs u10)', async () => {
    const k10 = roleContextKey('u10', 'z@x.com', '');
    await loadRoleContext(k10, async () => admin);
    invalidateRoleContext('u1');
    expect(getCachedRoleContext(k10)).toBeDefined();
  });

  it('una invalidación con la consulta en vuelo descarta su resultado (no re-cachea datos viejos)', async () => {
    const key = roleContextKey('u1', 'a@x.com', '');
    let release!: (v: CachedRoleContext) => void;
    const slow = new Promise<CachedRoleContext>((r) => (release = r));
    const pending = loadRoleContext(key, () => slow);
    invalidateRoleContext('u1'); // el rol cambia mientras se consultaba
    release(admin);
    await pending;
    expect(getCachedRoleContext(key)).toBeUndefined();
  });

  it('comparte la consulta entre peticiones simultáneas del mismo usuario', async () => {
    const key = roleContextKey('u1', 'a@x.com', '');
    const loader = vi.fn(async () => admin);
    await Promise.all([loadRoleContext(key, loader), loadRoleContext(key, loader), loadRoleContext(key, loader)]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('la clave distingue usuario, email y workspace pedido', () => {
    const a = roleContextKey('u1', 'a@x.com', '');
    expect(roleContextKey('u1', 'a@x.com', 'ws-2')).not.toBe(a);
    expect(roleContextKey('u2', 'a@x.com', '')).not.toBe(a);
    expect(roleContextKey('u1', 'A@X.com ', '')).toBe(a);
  });
});
