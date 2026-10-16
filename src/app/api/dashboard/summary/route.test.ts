import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { Role } from '@/lib/roles-shared';

const state = vi.hoisted(() => ({ role: 'agente' as Role }));
const data = vi.hoisted(() => ({ build: vi.fn(), invalidate: vi.fn() }));

vi.mock('@/lib/roles', async () => {
  const actual = await vi.importActual<typeof import('@/lib/roles')>('@/lib/roles');
  return {
    ...actual,
    requireRole: vi.fn(async (_req: NextRequest, allowed: Role[]) => {
      if (!allowed.includes(state.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      return {
        auth: { userId: 'u1', email: 'u@rai.local', displayName: 'Reiner' },
        workspace: { id: 'ws-1', ownerId: 'o1', name: 'Mi espacio' },
        role: state.role,
      };
    }),
  };
});
vi.mock('@/lib/dashboard-data', () => ({ buildDashboardSummary: data.build, invalidateDashboard: data.invalidate }));

import { GET } from './route';

const req = (qs = '') => new NextRequest(`http://localhost/api/dashboard/summary${qs}`);

describe('GET /api/dashboard/summary', () => {
  beforeEach(() => {
    state.role = 'agente';
    data.build.mockReset().mockResolvedValue({ days: 7 });
    data.invalidate.mockReset();
  });

  it('usa el workspace y el rol de la sesión, nunca del cliente', async () => {
    const res = await GET(req('?days=30&workspaceId=otro&role=admin'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(data.build).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      role: 'agente',
      days: 30,
      me: { displayName: 'Reiner', workspaceName: 'Mi espacio' },
    });
    expect(data.invalidate).not.toHaveBeenCalled();
  });

  it('un periodo inválido cae a 7 días', async () => {
    await GET(req('?days=999'));
    expect(data.build.mock.calls[0][0].days).toBe(7);
  });

  it('fresh=1 descarta la caché del servidor', async () => {
    await GET(req('?fresh=1'));
    expect(data.invalidate).toHaveBeenCalledWith('ws-1');
  });

  it('todos los roles del módulo pueden leerlo (viewer incluido)', async () => {
    for (const role of ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'staff', 'viewer'] as Role[]) {
      state.role = role;
      expect((await GET(req())).status).toBe(200);
    }
  });
});
