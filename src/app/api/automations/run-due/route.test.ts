import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/automations/engine', () => ({
  runDueWorkflows: vi.fn(),
}));

import { runDueWorkflows } from '@/lib/automations/engine';
import { GET } from './route';

function request(authorization?: string) {
  return new NextRequest('http://localhost/api/automations/run-due', {
    headers: authorization ? { authorization } : undefined,
  });
}

describe('GET /api/automations/run-due', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.mocked(runDueWorkflows).mockReset();
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it('rechaza cuando CRON_SECRET no está configurado', async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(runDueWorkflows).not.toHaveBeenCalled();
  });

  it('rechaza cuando falta el header Authorization', async () => {
    process.env.CRON_SECRET = 'cron-secret';

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(runDueWorkflows).not.toHaveBeenCalled();
  });

  it('rechaza cuando el Bearer no coincide', async () => {
    process.env.CRON_SECRET = 'cron-secret';

    const response = await GET(request('Bearer incorrecto'));

    expect(response.status).toBe(401);
    expect(runDueWorkflows).not.toHaveBeenCalled();
  });

  it('ejecuta los workflows cuando el Bearer coincide', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    vi.mocked(runDueWorkflows).mockResolvedValue({ resumed: 2, triggered: 3 });

    const response = await GET(request('Bearer cron-secret'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runDueWorkflows).toHaveBeenCalledOnce();
    expect(body).toMatchObject({ ok: true, resumed: 2, triggered: 3 });
    expect(body.ranAt).toEqual(expect.any(String));
  });
});
