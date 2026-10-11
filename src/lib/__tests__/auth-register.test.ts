import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks --------------------------------------------------------------

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    workspaceMember: { findMany: vi.fn(), updateMany: vi.fn() },
    workspace: { create: vi.fn() },
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
import { resetRateLimits } from '@/lib/rate-limit';

function makeReq(body: unknown, ip = '1.2.3.4') {
  // acceptTerms:true por defecto (obligatorio en todo registro); los tests que lo prueban lo sobrescriben.
  const withTerms =
    body && typeof body === 'object' ? { acceptTerms: true, ...(body as object) } : body;
  return { json: async () => withTerms, headers: new Headers({ 'x-forwarded-for': ip }) } as any;
}

describe('POST /api/auth/register — registro abierto con workspace propio', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.mocked(prisma.workspace.create).mockReset();
    vi.mocked(prisma.workspace.create).mockResolvedValue({ id: 'ws-new' } as any);
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.create).mockReset();
    vi.mocked(prisma.user.update).mockReset();
    vi.mocked(prisma.workspaceMember.findMany).mockReset();
    vi.mocked(prisma.workspaceMember.updateMany).mockReset();
    vi.mocked(isPlatformSuperAdmin).mockReset();
    vi.mocked(isPlatformSuperAdmin).mockReturnValue(false);
  });

  it('sin invitación ni super admin → registro abierto: crea User y Workspace propio («Mi negocio»)', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u9', email: 'nuevo@x.com' } as any);

    const res = await POST(makeReq({ email: 'nuevo@x.com', password: 'password123' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, email: 'nuevo@x.com', workspaceId: 'ws-new' });
    expect(prisma.workspace.create).toHaveBeenCalledWith({
      data: { ownerId: 'u9', name: 'Mi negocio' },
    });
    // El owner no necesita fila de membership (rol admin por ownerId).
    expect(prisma.workspaceMember.updateMany).not.toHaveBeenCalled();
  });

  it('businessName: trim, vacío → «Mi negocio», y recorte a 120 caracteres', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u9', email: 'n@x.com' } as any);

    await POST(makeReq({ email: 'n@x.com', password: 'password123', businessName: '  Café Sol  ' }, '9.9.9.1'));
    expect(prisma.workspace.create).toHaveBeenLastCalledWith({ data: { ownerId: 'u9', name: 'Café Sol' } });

    await POST(makeReq({ email: 'n2@x.com', password: 'password123', businessName: '   ' }, '9.9.9.2'));
    expect(prisma.workspace.create).toHaveBeenLastCalledWith({ data: { ownerId: 'u9', name: 'Mi negocio' } });

    await POST(makeReq({ email: 'n3@x.com', password: 'password123', businessName: 'x'.repeat(300) }, '9.9.9.3'));
    const lastName = (vi.mocked(prisma.workspace.create).mock.calls.at(-1)![0] as any).data.name as string;
    expect(lastName).toHaveLength(120);
  });

  it('sin acceptTerms → 400 y no crea User ni Workspace', async () => {
    const res = await POST(makeReq({ email: 'a@b.com', password: 'password123', acceptTerms: false }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Debes aceptar los Términos y la Política de privacidad.');
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.workspace.create).not.toHaveBeenCalled();
  });

  it('honeypot `website` con contenido → 400 genérico, sin crear nada', async () => {
    const res = await POST(makeReq({ email: 'bot@x.com', password: 'password123', website: 'http://spam' }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('No se pudo completar el registro.');
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.workspace.create).not.toHaveBeenCalled();
  });

  it('rate-limit: el 6.º intento con el mismo email en 15 min → 429 con Retry-After', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', passwordHash: 'scrypt:x' } as any);

    for (let i = 0; i < 5; i++) {
      const r = await POST(makeReq({ email: 'spam@x.com', password: 'password123' }, `8.8.8.${i}`));
      expect(r.status).toBe(409);
    }
    const res = await POST(makeReq({ email: 'spam@x.com', password: 'password123' }, '8.8.8.99'));

    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('rate-limit por IP: el 6.º intento desde la misma IP → 429', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', passwordHash: 'scrypt:x' } as any);

    for (let i = 0; i < 5; i++) {
      await POST(makeReq({ email: `ip${i}@x.com`, password: 'password123' }, '7.7.7.7'));
    }
    const res = await POST(makeReq({ email: 'otro@x.com', password: 'password123' }, '7.7.7.7'));

    expect(res.status).toBe(429);
  });

  it('cuenta SSO sin password y SIN invitación → 409 (evita fijar la clave de una cuenta ajena)', async () => {
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', email: 'sso@x.com', passwordHash: null } as any);

    const res = await POST(makeReq({ email: 'sso@x.com', password: 'password123' }));

    expect(res.status).toBe(409);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.workspace.create).not.toHaveBeenCalled();
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
    // Con invitación NO se crea workspace propio: entra al del equipo.
    expect(prisma.workspace.create).not.toHaveBeenCalled();
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
    // Bootstrap de super admin: no crea workspace (se auto-provisiona al usarlo).
    expect(prisma.workspace.create).not.toHaveBeenCalled();
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

  it('teléfono opcional: se normaliza y se guarda; inválido → 400', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u9' } as any);
    const ok = await POST(makeReq({ email: 'p@x.com', password: 'abcdefgh', phone: '+58 412 123-4567' }));
    expect(ok.status).toBe(200);
    expect((vi.mocked(prisma.user.create).mock.calls[0][0] as any).data.phone).toBe('+584121234567');
    const bad = await POST(makeReq({ email: 'q@x.com', password: 'abcdefgh', phone: '0412' }));
    expect(bad.status).toBe(400);
  });
});
