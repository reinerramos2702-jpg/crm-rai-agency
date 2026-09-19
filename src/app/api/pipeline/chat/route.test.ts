import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/roles', () => ({
  CAMPAIGN_ROLES: ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente'],
  requireRole: vi.fn(),
  isRoleContext: vi.fn(),
}));

import { isRoleContext, requireRole } from '@/lib/roles';
import { POST } from './route';

const ALLOWED_ROLES = ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente'];

function request() {
  return new NextRequest('http://localhost/api/pipeline/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [], model: 'gpt-4.1-mini' }),
  });
}

describe('POST /api/pipeline/chat', () => {
  const originalOpenAIKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.mocked(requireRole).mockReset();
    vi.mocked(isRoleContext).mockReset();
  });

  afterEach(() => {
    if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAIKey;
    vi.unstubAllGlobals();
  });

  it('devuelve el error de autenticación antes de procesar el chat', async () => {
    const unauthorized = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    vi.mocked(requireRole).mockResolvedValue(unauthorized);
    vi.mocked(isRoleContext).mockReturnValue(false);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const req = request();
    const response = await POST(req);

    expect(requireRole).toHaveBeenCalledWith(req, ALLOWED_ROLES);
    expect(response).toBe(unauthorized);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('permite continuar al agente como rol de menor privilegio autorizado', async () => {
    const roleContext = {
      auth: { userId: 'user-1', email: 'test@rai.local' },
      workspace: { id: 'ws-1', ownerId: 'owner-1', name: 'Test WS' },
      role: 'agente' as const,
    };
    vi.mocked(requireRole).mockResolvedValue(roleContext);
    vi.mocked(isRoleContext).mockReturnValue(true);
    delete process.env.OPENAI_API_KEY;

    const req = request();
    const response = await POST(req);

    expect(requireRole).toHaveBeenCalledWith(req, ALLOWED_ROLES);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'OPENAI_API_KEY not configured' });
  });
});
