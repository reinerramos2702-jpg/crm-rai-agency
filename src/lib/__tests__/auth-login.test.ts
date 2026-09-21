import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks --------------------------------------------------------------

vi.mock('@/lib/db', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

vi.mock('@/lib/password', () => ({
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  signJwt: vi.fn(),
  SESSION_COOKIE: 'rai_session',
}));

import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { signJwt } from '@/lib/auth';
import { POST } from '@/app/api/auth/login/route';
import { resetRateLimits } from '@/lib/rate-limit';

function makeReq(body: unknown, ip = '1.2.3.4') {
  return { json: async () => body, headers: new Headers({ 'x-forwarded-for': ip }) } as any;
}

const USER = {
  id: 'u1',
  email: 'user@x.com',
  displayName: 'Ana',
  passwordHash: 'scrypt:hash',
};

describe('POST /api/auth/login — JWT en cookie httpOnly (Etapa 3)', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(verifyPassword).mockReset();
    vi.mocked(signJwt).mockReset();
    vi.mocked(signJwt).mockResolvedValue('jwt-fake');
  });

  it('login ok → 200 con cookie httpOnly rai_session y JWT firmado', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any);
    vi.mocked(verifyPassword).mockReturnValue(true);

    const res = await POST(makeReq({ email: 'user@x.com', password: 'password123' }));

    expect(res.status).toBe(200);
    const cookie = res.cookies.get('rai_session');
    expect(cookie?.value).toBe('jwt-fake');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(signJwt).toHaveBeenCalledWith({
      userId: 'u1',
      email: 'user@x.com',
      displayName: 'Ana',
    });
  });

  it('password incorrecto → 401 genérico, sin cookie', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any);
    vi.mocked(verifyPassword).mockReturnValue(false);

    const res = await POST(makeReq({ email: 'user@x.com', password: 'malo' }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Credenciales inválidas');
    expect(res.cookies.get('rai_session')).toBeUndefined();
  });

  it('usuario inexistente → 401 genérico (no filtra que el email no existe)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await POST(makeReq({ email: 'nadie@x.com', password: 'password123' }));

    expect(res.status).toBe(401);
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('usuario sin passwordHash (SSO/dev) → 401, no verifica password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER, passwordHash: null } as any);

    const res = await POST(makeReq({ email: 'user@x.com', password: 'password123' }));

    expect(res.status).toBe(401);
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('body sin password → 400', async () => {
    const res = await POST(makeReq({ email: 'user@x.com' }));
    expect(res.status).toBe(400);
  });

  it('rate-limit: el 6to intento con el mismo email → 429 con Retry-After', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any);
    vi.mocked(verifyPassword).mockReturnValue(false);

    for (let i = 0; i < 5; i++) {
      const r = await POST(makeReq({ email: 'user@x.com', password: 'malo' }));
      expect(r.status).toBe(401);
    }

    const r6 = await POST(makeReq({ email: 'user@x.com', password: 'malo' }));
    expect(r6.status).toBe(429);
    expect(r6.headers.get('retry-after')).toBeTruthy();
  });
});