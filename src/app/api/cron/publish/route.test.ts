import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/schedule-runtime', () => ({ productionDeps: vi.fn(() => ({ mode: 'simulated' })) }));
vi.mock('@/lib/publish-runner', () => ({ runDuePosts: vi.fn() }));

import { runDuePosts } from '@/lib/publish-runner';
import { GET, POST } from './route';

const req = (authorization?: string) =>
  new NextRequest('http://localhost/api/cron/publish', { method: 'POST', headers: authorization ? { authorization } : undefined });

describe('/api/cron/publish', () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => vi.mocked(runDuePosts).mockReset());
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('401 sin CRON_SECRET configurado', async () => {
    delete process.env.CRON_SECRET;
    expect((await POST(req('Bearer x'))).status).toBe(401);
    expect(runDuePosts).not.toHaveBeenCalled();
  });
  it('401 sin header o con Bearer incorrecto (también de distinta longitud)', async () => {
    process.env.CRON_SECRET = 'secreto';
    expect((await POST(req())).status).toBe(401);
    expect((await POST(req('Bearer otro'))).status).toBe(401);
    expect((await GET(req('Bearer secreto-largo'))).status).toBe(401);
    expect(runDuePosts).not.toHaveBeenCalled();
  });
  it('ejecuta y devuelve resumen con el Bearer correcto', async () => {
    process.env.CRON_SECRET = 'secreto';
    vi.mocked(runDuePosts).mockResolvedValue({ recovered: 0, due: 2, claimed: 2, published: 2, retried: 0, failed: 0 });
    const res = await POST(req('Bearer secreto'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, mode: 'simulated', published: 2 });
    expect(runDuePosts).toHaveBeenCalledOnce();
  });
});
