import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { upsert: vi.fn().mockResolvedValue({}) },
  },
}));

import { getAuth, isDevBypassActive } from '@/lib/auth';

const REQ_SIN_TOKEN = { headers: new Headers() } as any;

describe('auth.ts — DEV_BYPASS_AUTH solo fuera de producción', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('DEV_BYPASS_AUTH=true en development → bypass activo (usuario dummy)', async () => {
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'development');

    expect(isDevBypassActive()).toBe(true);
    const ctx = await getAuth(REQ_SIN_TOKEN);
    expect(ctx?.userId).toBe('dev-user-001');
  });

  it('DEV_BYPASS_AUTH=true en production → ignorado, request sin JWT no autentica', async () => {
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(isDevBypassActive()).toBe(false);
    const ctx = await getAuth(REQ_SIN_TOKEN);
    expect(ctx).toBeNull();

    errorSpy.mockRestore();
  });

  it('DEV_BYPASS_AUTH con un valor distinto de "true" (p.ej. un secreto pegado por error) → sin bypass', async () => {
    vi.stubEnv('DEV_BYPASS_AUTH', 'sk_live_valor_de_prueba_no_real');
    vi.stubEnv('NODE_ENV', 'development');

    expect(isDevBypassActive()).toBe(false);
    expect(await getAuth(REQ_SIN_TOKEN)).toBeNull();
  });
});
