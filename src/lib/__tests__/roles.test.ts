import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import type { AuthContext } from '@/lib/auth';

// --- Mocks --------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('@/lib/workspace', () => ({
  getOrCreateWorkspace: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    workspaceMember: {
      findFirst: vi.fn(),
    },
  },
}));

import { getAuth } from '@/lib/auth';
import { getOrCreateWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { requireRole, requirePermission, isRoleContext } from '@/lib/roles';

const FAKE_AUTH: AuthContext = { userId: 'user-1', email: 'test@rai.local' };
const FAKE_WORKSPACE = { id: 'ws-1', ownerId: 'owner-1', name: 'Test WS' };
const FAKE_REQ = {} as any;

describe('roles.ts — requireRole / requirePermission', () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
    vi.mocked(getOrCreateWorkspace).mockReset();
    vi.mocked(prisma.workspaceMember.findFirst).mockReset();

    vi.mocked(getAuth).mockResolvedValue(FAKE_AUTH);
    vi.mocked(getOrCreateWorkspace).mockResolvedValue(FAKE_WORKSPACE as any);
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
