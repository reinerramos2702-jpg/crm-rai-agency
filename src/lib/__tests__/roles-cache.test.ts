import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({ getAuth: vi.fn(), isPlatformSuperAdmin: vi.fn() }));
vi.mock('@/lib/workspace', () => {
  class WorkspaceAccessError extends Error {
    constructor(public status: 403 | 404, message: string) {
      super(message);
    }
  }
  return { getOrCreateWorkspace: vi.fn(), resolveActiveWorkspace: vi.fn(), WorkspaceAccessError };
});
vi.mock('@/lib/db', () => ({ prisma: { workspaceMember: { findFirst: vi.fn() } } }));

import { getAuth, isPlatformSuperAdmin } from '@/lib/auth';
import { resolveActiveWorkspace, WorkspaceAccessError } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { getRoleContext } from '@/lib/roles';
import { ROLE_CONTEXT_TTL_MS, invalidateRoleContext, resetRoleContextCache } from '@/lib/role-context-cache';

const AUTH: AuthContext = { userId: 'user-1', email: 'u1@rai.local' };
const WS = { id: 'ws-1', ownerId: 'owner-1', name: 'WS' };
const req = (ws?: string) => ({ headers: { get: (h: string) => (h === 'x-workspace-id' ? ws ?? null : null) } }) as any;

describe('getRoleContext — caché de contexto de ≤5 s', () => {
  beforeEach(() => {
    resetRoleContextCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
    vi.mocked(getAuth).mockReset().mockResolvedValue(AUTH);
    vi.mocked(isPlatformSuperAdmin).mockReset().mockReturnValue(false);
    vi.mocked(resolveActiveWorkspace).mockReset().mockResolvedValue(WS);
    vi.mocked(prisma.workspaceMember.findFirst).mockReset().mockResolvedValue({ role: 'admin', status: 'active' } as any);
  });
  afterEach(() => vi.useRealTimers());

  it('la segunda petición no toca la base, pero la identidad se verifica siempre', async () => {
    await getRoleContext(req());
    const ctx = await getRoleContext(req());
    expect(ctx?.role).toBe('admin');
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledTimes(1);
    expect(resolveActiveWorkspace).toHaveBeenCalledTimes(1);
    expect(getAuth).toHaveBeenCalledTimes(2);
  });

  it('sin sesión válida → null y nunca consulta ni cachea', async () => {
    vi.mocked(getAuth).mockResolvedValue(null);
    expect(await getRoleContext(req())).toBeNull();
    expect(resolveActiveWorkspace).not.toHaveBeenCalled();
  });

  it('una sesión expirada/inválida no hereda el contexto cacheado de un request anterior', async () => {
    await getRoleContext(req());
    vi.mocked(getAuth).mockResolvedValue(null);
    expect(await getRoleContext(req())).toBeNull();
  });

  it('degradar un rol surte efecto en cuanto vence el TTL (≤5 s) sin invalidación explícita', async () => {
    expect((await getRoleContext(req()))?.role).toBe('admin');
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ role: 'staff', status: 'active' } as any);
    vi.advanceTimersByTime(ROLE_CONTEXT_TTL_MS + 1);
    expect((await getRoleContext(req()))?.role).toBe('staff');
  });

  it('invalidateRoleContext(userId) hace efectivo el cambio al instante', async () => {
    expect((await getRoleContext(req()))?.role).toBe('admin');
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ role: 'staff', status: 'active' } as any);
    invalidateRoleContext('user-1');
    expect((await getRoleContext(req()))?.role).toBe('staff');
  });

  it('sin acceso al workspace pedido → null y NO se cachea (conceder acceso se ve al instante)', async () => {
    vi.mocked(resolveActiveWorkspace).mockRejectedValueOnce(new WorkspaceAccessError(403, 'no'));
    expect(await getRoleContext(req('ws-ajeno'))).toBeNull();
    vi.mocked(resolveActiveWorkspace).mockResolvedValue({ id: 'ws-ajeno', ownerId: 'x', name: 'A' });
    expect((await getRoleContext(req('ws-ajeno')))?.role).toBe('admin');
  });

  it('el rol viewer (sin membresía) no se cachea: una invitación aceptada se ve al instante', async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValueOnce(null);
    expect((await getRoleContext(req()))?.role).toBe('viewer');
    expect((await getRoleContext(req()))?.role).toBe('admin');
  });

  it('el workspace activo forma parte de la clave: cambiar de workspace no reutiliza el rol del otro', async () => {
    await getRoleContext(req());
    vi.mocked(resolveActiveWorkspace).mockResolvedValue({ id: 'ws-2', ownerId: 'x', name: 'Otro' });
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ role: 'staff', status: 'active' } as any);
    const ctx = await getRoleContext(req('ws-2'));
    expect(ctx?.workspace.id).toBe('ws-2');
    expect(ctx?.role).toBe('staff');
  });

  it('ROLE_CONTEXT_CACHE=off desactiva la caché', async () => {
    vi.stubEnv('ROLE_CONTEXT_CACHE', 'off');
    await getRoleContext(req());
    await getRoleContext(req());
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledTimes(2);
    vi.unstubAllEnvs();
  });
});
