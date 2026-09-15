import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  prisma: {
    workspace: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    workspaceMember: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import {
  resolveActiveWorkspace,
  invalidateWorkspaceCache,
  WorkspaceAccessError,
} from '@/lib/workspace';

const AUTH: AuthContext = { userId: 'user-1', email: 'u1@rai.local' };
const OWN_WS = { id: 'ws-own', name: 'Propio', ownerId: 'user-1' };
const OTHER_WS = { id: 'ws-other', name: 'Ajeno', ownerId: 'user-2' };

function reqWith(headers: Record<string, string> = {}) {
  return { headers: new Headers(headers) } as any;
}

describe('workspace.ts — resolveActiveWorkspace', () => {
  beforeEach(() => {
    vi.mocked(prisma.workspace.findFirst).mockReset();
    vi.mocked(prisma.workspace.findUnique).mockReset();
    vi.mocked(prisma.workspace.create).mockReset();
    vi.mocked(prisma.workspaceMember.findFirst).mockReset();
    invalidateWorkspaceCache();
  });

  it('sin header → workspace propio (comportamiento legacy, sin tocar membresías)', async () => {
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(OWN_WS as any);

    const ws = await resolveActiveWorkspace(reqWith(), AUTH);

    expect(ws.id).toBe('ws-own');
    expect(prisma.workspace.findFirst).toHaveBeenCalledWith({ where: { ownerId: 'user-1' } });
    expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
    expect(prisma.workspaceMember.findFirst).not.toHaveBeenCalled();
  });

  it('header apuntando al workspace propio → lo devuelve sin consultar membresía', async () => {
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(OWN_WS as any);

    const ws = await resolveActiveWorkspace(reqWith({ 'x-workspace-id': 'ws-own' }), AUTH);

    expect(ws.id).toBe('ws-own');
    expect(prisma.workspaceMember.findFirst).not.toHaveBeenCalled();
  });

  it('header a workspace ajeno con membresía activa → devuelve ese workspace', async () => {
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(OTHER_WS as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ id: 'm1' } as any);

    const ws = await resolveActiveWorkspace(reqWith({ 'x-workspace-id': 'ws-other' }), AUTH);

    expect(ws.id).toBe('ws-other');
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith({
      where: { workspaceId: 'ws-other', userId: 'user-1', status: 'active' },
    });
  });

  it('header a workspace ajeno SIN membresía activa → 403, nunca fallback al propio', async () => {
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(OTHER_WS as any);
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue(null);

    const err = await resolveActiveWorkspace(reqWith({ 'x-workspace-id': 'ws-other' }), AUTH).catch((e) => e);

    expect(err).toBeInstanceOf(WorkspaceAccessError);
    expect(err.status).toBe(403);
    expect(prisma.workspace.findFirst).not.toHaveBeenCalled();
  });

  it('membresía invitada/suspendida no cuenta: el filtro exige status active', async () => {
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(OTHER_WS as any);
    // Prisma devolvería null para status != 'active' porque el where lo filtra.
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue(null);

    await expect(
      resolveActiveWorkspace(reqWith({ 'x-workspace-id': 'ws-other' }), AUTH)
    ).rejects.toMatchObject({ status: 403 });
    expect(vi.mocked(prisma.workspaceMember.findFirst).mock.calls[0][0]).toMatchObject({
      where: { status: 'active' },
    });
  });

  it('header a workspace inexistente → 404', async () => {
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

    await expect(
      resolveActiveWorkspace(reqWith({ 'x-workspace-id': 'ws-nope' }), AUTH)
    ).rejects.toMatchObject({ status: 404 });
  });
});
