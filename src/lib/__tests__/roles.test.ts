import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import type { AuthContext } from '@/lib/auth';

// --- Mocks --------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
  isPlatformSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/workspace', () => {
  class WorkspaceAccessError extends Error {
    constructor(public status: 403 | 404, message: string) {
      super(message);
    }
  }
  return {
    getOrCreateWorkspace: vi.fn(),
    resolveActiveWorkspace: vi.fn(),
    WorkspaceAccessError,
  };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    workspaceMember: {
      findFirst: vi.fn(),
    },
  },
}));

import { getAuth, isPlatformSuperAdmin } from '@/lib/auth';
import { resolveActiveWorkspace, WorkspaceAccessError } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { requireRole, requirePermission, isRoleContext, getRoleContext } from '@/lib/roles';

const FAKE_AUTH: AuthContext = { userId: 'user-1', email: 'test@rai.local' };
const FAKE_WORKSPACE = { id: 'ws-1', ownerId: 'owner-1', name: 'Test WS' };
const FAKE_REQ = {} as any;

describe('roles.ts — requireRole / requirePermission', () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
    vi.mocked(resolveActiveWorkspace).mockReset();
    vi.mocked(prisma.workspaceMember.findFirst).mockReset();

    vi.mocked(getAuth).mockResolvedValue(FAKE_AUTH);
    vi.mocked(resolveActiveWorkspace).mockResolvedValue(FAKE_WORKSPACE);
    vi.mocked(isPlatformSuperAdmin).mockReset();
    vi.mocked(isPlatformSuperAdmin).mockReturnValue(false);
  });

  it('email en SUPER_ADMIN_EMAILS → super_admin aunque no tenga membresía', async () => {
    vi.mocked(isPlatformSuperAdmin).mockReturnValue(true);

    const ctx = await getRoleContext(FAKE_REQ);

    expect(isPlatformSuperAdmin).toHaveBeenCalledWith(FAKE_AUTH.email);
    expect(ctx?.role).toBe('super_admin');
    expect(prisma.workspaceMember.findFirst).not.toHaveBeenCalled();
  });

  it('role super_admin guardado en WorkspaceMember se ignora → viewer (no hay escalada vía Team)', async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      role: 'super_admin',
      status: 'active',
    } as any);

    const result = await requireRole(FAKE_REQ, ['super_admin', 'admin']);

    expect(isRoleContext(result)).toBe(false);
    expect((result as NextResponse).status).toBe(403);
  });

  it('getRoleContext resuelve el workspace vía resolveActiveWorkspace (mecanismo único)', async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue(null);

    const ctx = await getRoleContext(FAKE_REQ);

    expect(resolveActiveWorkspace).toHaveBeenCalledWith(FAKE_REQ, FAKE_AUTH);
    expect(ctx?.workspace).toEqual(FAKE_WORKSPACE);
  });

  it('el owner del workspace resuelto es admin sin fila de membresía', async () => {
    vi.mocked(resolveActiveWorkspace).mockResolvedValue({ ...FAKE_WORKSPACE, ownerId: FAKE_AUTH.userId });

    const ctx = await getRoleContext(FAKE_REQ);

    expect(ctx?.role).toBe('admin');
    expect(prisma.workspaceMember.findFirst).not.toHaveBeenCalled();
  });

  it('workspace no accesible (WorkspaceAccessError 403) → requireRole responde 401, nunca otro workspace', async () => {
    vi.mocked(resolveActiveWorkspace).mockRejectedValue(new WorkspaceAccessError(403, 'sin acceso'));

    const result = await requireRole(FAKE_REQ, ['admin', 'viewer']);

    expect(isRoleContext(result)).toBe(false);
    expect((result as NextResponse).status).toBe(401);
  });

  it('errores que no son de acceso (p.ej. DB caída) se propagan, no se tragan como 401', async () => {
    vi.mocked(resolveActiveWorkspace).mockRejectedValue(new Error('db down'));

    await expect(getRoleContext(FAKE_REQ)).rejects.toThrow('db down');
  });

  it('requireRole devuelve 403 cuando el rol no alcanza', async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      role: 'viewer',
      status: 'active',
    } as any);

    const result = await requireRole(FAKE_REQ, ['admin']);

    expect(isRoleContext(result)).toBe(false);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('requireRole devuelve RoleContext cuando el rol sí alcanza', async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      role: 'viewer',
      status: 'active',
    } as any);

    const result = await requireRole(FAKE_REQ, ['admin', 'viewer']);

    expect(isRoleContext(result)).toBe(true);
    if (isRoleContext(result)) {
      expect(result.role).toBe('viewer');
      expect(result.auth).toEqual(FAKE_AUTH);
      expect(result.workspace).toEqual(FAKE_WORKSPACE);
    }
  });

  it('requirePermission devuelve 403 cuando el permiso no alcanza', async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      role: 'agente',
      status: 'active',
    } as any);

    const result = await requirePermission(FAKE_REQ, 'canManageBilling');

    expect(isRoleContext(result)).toBe(false);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('requirePermission devuelve RoleContext cuando el permiso sí alcanza', async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      role: 'agente',
      status: 'active',
    } as any);

    const result = await requirePermission(FAKE_REQ, 'canCreateLead');

    expect(isRoleContext(result)).toBe(true);
    if (isRoleContext(result)) {
      expect(result.role).toBe('agente');
    }
  });

  it('sin autenticación, requireRole y requirePermission devuelven 401', async () => {
    vi.mocked(getAuth).mockResolvedValue(null);

    const roleResult = await requireRole(FAKE_REQ, ['admin']);
    expect(isRoleContext(roleResult)).toBe(false);
    expect((roleResult as NextResponse).status).toBe(401);

    const permResult = await requirePermission(FAKE_REQ, 'canCreateLead');
    expect(isRoleContext(permResult)).toBe(false);
    expect((permResult as NextResponse).status).toBe(401);
  });

  it('sin membresía activa (findFirst → null) el rol cae a viewer por default', async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue(null);

    const result = await requireRole(FAKE_REQ, ['viewer']);

    expect(isRoleContext(result)).toBe(true);
    if (isRoleContext(result)) {
      expect(result.role).toBe('viewer');
    }
  });
});
