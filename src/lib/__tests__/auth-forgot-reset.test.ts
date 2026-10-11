import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    passwordResetToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}));
vi.mock('@/lib/password', () => ({ hashPassword: vi.fn().mockResolvedValue('scrypt:new') }));
vi.mock('@/lib/notify', async () => {
  const actual = await vi.importActual<typeof import('@/lib/notify')>('@/lib/notify');
  return { ...actual, sendPasswordReset: vi.fn().mockResolvedValue({ ok: true }) };
});

import { prisma } from '@/lib/db';
import { sendPasswordReset } from '@/lib/notify';
import { POST as forgot } from '@/app/api/auth/forgot-password/route';
import { POST as reset } from '@/app/api/auth/reset-password/route';
import { resetRateLimits } from '@/lib/rate-limit';
import { hashResetToken } from '@/lib/reset-token';
import { normalizePhone } from '@/lib/phone';

const req = (body: unknown, ip = '9.9.9.9') =>
  ({ json: async () => body, headers: new Headers({ 'x-forwarded-for': ip }) }) as any;

beforeEach(() => {
  resetRateLimits();
  vi.clearAllMocks();
  vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 } as any);
  vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as any);
  vi.mocked(prisma.user.update).mockResolvedValue({} as any);
});

describe('normalizePhone', () => {
  it('normaliza y rechaza', () => {
    expect(normalizePhone('+58 (412) 123-4567')).toBe('+584121234567');
    expect(normalizePhone('00584121234567')).toBe('+584121234567');
    expect(normalizePhone('04121234567')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone(123)).toBeNull();
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('email existente → token hasheado + envío por email, respuesta genérica', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as any);
    const res = await forgot(req({ identifier: 'Reiner@Mail.com' }));
    expect(res.status).toBe(200);
    const created = vi.mocked(prisma.passwordResetToken.create).mock.calls[0][0].data as any;
    expect(created.userId).toBe('u1');
    expect(created.channel).toBe('email');
    expect(created.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    const msg = vi.mocked(sendPasswordReset).mock.calls[0][0];
    expect(msg.channel).toBe('email');
    expect(msg.to).toBe('reiner@mail.com');
    const token = msg.link.split('token=')[1];
    expect(hashResetToken(token)).toBe(created.tokenHash); // en DB solo el hash
  });

  it('email inexistente → misma respuesta, sin token ni envío', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const a = await forgot(req({ identifier: 'nadie@mail.com' }));
    expect(a.status).toBe(200);
    expect(await a.json()).toEqual({ ok: true, message: expect.any(String) });
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendPasswordReset).not.toHaveBeenCalled();
  });

  it('teléfono con 1 cuenta → SMS; con 2 cuentas (ambiguo) → no envía', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([{ id: 'u2' }] as any);
    await forgot(req({ identifier: '+58 412 1234567' }));
    expect(vi.mocked(sendPasswordReset).mock.calls[0][0]).toMatchObject({
      channel: 'sms',
      to: '+584121234567',
    });
    vi.mocked(sendPasswordReset).mockClear();
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }] as any);
    const r = await forgot(req({ identifier: '+58 412 7654321' }));
    expect(r.status).toBe(200);
    expect(sendPasswordReset).not.toHaveBeenCalled();
  });

  it('teléfono inválido → 400; vacío → 400', async () => {
    expect((await forgot(req({ identifier: '0412123' }))).status).toBe(400);
    expect((await forgot(req({ identifier: '  ' }))).status).toBe(400);
  });

  it('rate limit por identificador → 429 con Retry-After', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    for (let i = 0; i < 3; i++) await forgot(req({ identifier: 'x@mail.com' }, `1.1.1.${i}`));
    const res = await forgot(req({ identifier: 'x@mail.com' }, '1.1.1.9'));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('un fallo del proveedor no cambia la respuesta (no revela estado)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(sendPasswordReset).mockRejectedValueOnce(new Error('boom'));
    expect((await forgot(req({ identifier: 'a@b.com' }))).status).toBe(200);
  });
});

describe('POST /api/auth/reset-password', () => {
  const good = { userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() + 60_000) };

  it('token válido → cambia hash de contraseña y consume tokens del usuario', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(good as any);
    const res = await reset(req({ token: 'tok', password: 'nueva-clave-1' }));
    expect(res.status).toBe(200);
    expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashResetToken('tok') },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'scrypt:new' },
    });
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('vencido, usado, inexistente → 400 sin cambiar nada', async () => {
    for (const rec of [
      { ...good, expiresAt: new Date(Date.now() - 1) },
      { ...good, usedAt: new Date() },
      null,
    ]) {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValueOnce(rec as any);
      expect((await reset(req({ token: 't', password: 'nueva-clave-1' }))).status).toBe(400);
    }
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('contraseña corta o sin token → 400', async () => {
    expect((await reset(req({ token: 't', password: 'corta' }))).status).toBe(400);
    expect((await reset(req({ password: 'nueva-clave-1' }))).status).toBe(400);
  });
});
