import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks --------------------------------------------------------------

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    workspaceMember: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  isPlatformSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('scrypt:hash'),
}));

import { prisma } from '@/lib/db';
import { isPlatformSuperAdmin } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { POST } from '@/app/api/auth/register/route';

function makeReq(body: unknown) {
  return { json: async () => body } as any;
}

describe('POST /api/auth/register — registro SOLO por invitación (Etapa 3)', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.create).mockReset();
    vi.mocked(prisma.user.update).mockReset();
    vi.mocked(prisma.workspaceMember.findMany).mockReset();
    vi.mocked(prisma.workspaceMember.updateMany).mockReset();
    vi.mocked(isPlatformSuperAdmin).mockReset();
    vi.mocked(isPlatformSuperAdmin).mockReturnValue(false);
  });

  it('sin invitación pendiente y sin ser super admin → 403, no crea usuario', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([]);

    const res = await POST(makeReq({ email: 'nadie@x.com', password: 'password123' }));

    expect(res.status).toBe(403);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('email inválido → 400', async () => {
    const res = await POST(makeReq({ email: 'no-es-email', password: 'password123' }));
    expect(res.status).toBe(400);
  });

  it('password de menos de 8 caracteres → 400', async () => {
    const res = await POST(makeReq({ email: 'a@b.com', password: 'corta' }));
    expect(res.status).toBe(400);
  });

  it('con invitación pendiente → crea user, activa membresías y responde ok', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
      { id: 'm1', workspaceId: 'ws-1', email: 'invitado@x.com', status: 'invited' },
    ] as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u1', email: 'invitado@x.com' } as any);

    const res = await POST(
      makeReq({ email: '  Invitado@X.com ', password: 'password123', displayName: 'Ana' })
    );

    expect(res.status).toBe(200);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'invitado@x.com',
          passwordHash: 'scrypt:hash',
          displayName: 'Ana',
        }),
      })
    );
    expect(prisma.workspaceMember.updateMany).toHaveBeenCalledWith({
      where: { email: 'invitado@x.com', status: 'invited' },
      data: { status: 'active', userId: 'u1' },
    });
  });

  it('usuario ya existente con passwordHash → 409, no re-registra', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([{ id: 'm1' }] as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'scrypt:x',
    } as any);

    const res = await POST(makeReq({ email: 'a@b.com', password: 'password123' }));

    expect(res.status).toBe(409);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('super admin sin invitación → bootstrap permitido (gated por env var, no público)', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([]);
    vi.mocked(isPlatformSuperAdmin).mockReturnValue(true);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u1', email: 'ops@rai.agency' } as any);

    const res = await POST(makeReq({ email: 'ops@rai.agency', password: 'password123' }));

    expect(res.status).toBe(200);
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('usuario existente sin password (creado por SSO) con invitación → update con hash + activa membresías', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([{ id: 'm1' }] as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: null,
      displayName: 'Viejo',
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);

    const res = await POST(makeReq({ email: 'a@b.com', password: 'password123' }));

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'scrypt:hash', displayName: 'Viejo' },
    });
    expect(prisma.workspaceMember.updateMany).toHaveBeenCalled();
    expect(hashPassword).toHaveBeenCalledWith('password123');
  });
});