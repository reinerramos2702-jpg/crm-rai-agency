import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/roles', () => ({
  requirePermission: vi.fn(),
  isRoleContext: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: { settings: { findUnique: vi.fn(), upsert: vi.fn() } },
}));

import { prisma } from '@/lib/db';
import { isRoleContext, requirePermission } from '@/lib/roles';
import { GET, PUT } from './route';

const findUnique = vi.mocked(prisma.settings.findUnique);
const upsert = vi.mocked(prisma.settings.upsert);
const perm = vi.mocked(requirePermission);
const isCtx = vi.mocked(isRoleContext);

const ctx = { workspace: { id: 'ws-A' }, role: 'gerente' } as never;

function put(body: unknown, raw = false): NextRequest {
  return new NextRequest('http://localhost/api/content-planner/config', {
    method: 'PUT',
    body: raw ? (body as string) : JSON.stringify(body),
  });
}
const get = () => new NextRequest('http://localhost/api/content-planner/config');

beforeEach(() => {
  vi.clearAllMocks();
  perm.mockResolvedValue(ctx);
  isCtx.mockImplementation((x) => !(x instanceof NextResponse));
});

describe('GET /api/content-planner/config', () => {
  it('sin permiso → devuelve la respuesta de requirePermission y no toca la BD', async () => {
    perm.mockResolvedValue(NextResponse.json({ error: 'x' }, { status: 403 }));
    const res = await GET(get());
    expect(res.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('exige el permiso canManageContent', async () => {
    findUnique.mockResolvedValue(null);
    await GET(get());
    expect(perm).toHaveBeenCalledWith(expect.anything(), 'canManageContent');
  });

  it('empresa sin config → configured false y config vacía sin handle ajeno', async () => {
    findUnique.mockResolvedValue(null);
    const body = await (await GET(get())).json();
    expect(body.configured).toBe(false);
    expect(body.config.igHandle).toBe('');
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: 'ws-A' } }),
    );
  });

  it('empresa con config → configured true', async () => {
    findUnique.mockResolvedValue({ contentPlannerConfig: { businessName: 'Café' } } as never);
    const body = await (await GET(get())).json();
    expect(body.configured).toBe(true);
    expect(body.config.businessName).toBe('Café');
  });
});

describe('PUT /api/content-planner/config', () => {
  it('sin permiso → no escribe', async () => {
    perm.mockResolvedValue(NextResponse.json({ error: 'x' }, { status: 401 }));
    const res = await PUT(put({ businessName: 'x' }));
    expect(res.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('JSON inválido → 400', async () => {
    const res = await PUT(put('{no-json', true));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('escribe sanitizado y scopeado a ctx.workspace.id (ignora workspaceId del body)', async () => {
    findUnique.mockResolvedValue(null);
    const res = await PUT(
      put({ workspaceId: 'ws-EVIL', igHandle: ' mi marca ', publishTime: '18:30', hack: 1 }),
    );
    expect(res.status).toBe(200);
    const args = upsert.mock.calls[0][0] as {
      where: { workspaceId: string };
      create: { workspaceId: string; contentPlannerConfig: Record<string, unknown> };
    };
    expect(args.where.workspaceId).toBe('ws-A');
    expect(args.create.workspaceId).toBe('ws-A');
    expect(args.create.contentPlannerConfig.igHandle).toBe('@mimarca');
    expect(args.create.contentPlannerConfig.publishTime).toBe('18:30');
    expect(args.create.contentPlannerConfig.hack).toBeUndefined();
  });

  it('mezcla sobre lo ya guardado (guardado parcial no borra el resto)', async () => {
    findUnique.mockResolvedValue({
      contentPlannerConfig: { businessName: 'Café', services: 'Brunch' },
    } as never);
    const body = await (await PUT(put({ businessName: 'Café Nuevo' }))).json();
    expect(body.config.businessName).toBe('Café Nuevo');
    expect(body.config.services).toBe('Brunch');
  });

  it('config que excede el tope total → 413 y no escribe', async () => {
    findUnique.mockResolvedValue(null);
    const big = 'x'.repeat(190_000);
    const res = await PUT(
      put({
        brandDocContent: big,
        brandRules: Array.from({ length: 100 }, () => ({
          forbidden: 'f'.repeat(500),
          replacement: 'r'.repeat(500),
          reason: 'z'.repeat(500),
        })),
        services: 's'.repeat(5000),
        targetAudience: 't'.repeat(5000),
        competitors: 'c'.repeat(5000),
        contentNotes: 'n'.repeat(5000),
      }),
    );
    // 190k + 150k (reglas) + 20k > 300k
    expect(res.status).toBe(413);
    expect(upsert).not.toHaveBeenCalled();
  });
});
