import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({ prisma: { aIAgent: { findUnique: vi.fn() } } }));
vi.mock('@/lib/voice/store', () => ({
  prismaVoiceStore: {
    conversationWorkspace: vi.fn(async () => null),
    findOrCreateContact: vi.fn(async () => ({ id: 'c1' })),
    upsertConversation: vi.fn(async () => undefined),
    createMessagesIfMissing: vi.fn(async () => undefined),
    upsertMessage: vi.fn(async () => undefined),
  },
}));

import { prisma } from '@/lib/db';
import { resetRateLimits } from '@/lib/rate-limit';
import { prismaVoiceStore } from '@/lib/voice/store';
import { signRetellBody } from '@/lib/voice/signature';
import { POST } from './route';

const SECRET = 'key_webhook_0123456789';
const findAgent = vi.mocked(prisma.aIAgent.findUnique);

const payload = (event = 'call_ended') =>
  JSON.stringify({ event, call: { call_id: 'call_1', call_type: 'phone_call', from_number: '+584121234567', start_timestamp: Date.now(), duration_ms: 30_000, transcript_object: [{ role: 'user', content: 'hola' }] } });

function req(body: string, headers: Record<string, string> = {}, agent: string | null = 'agt_1') {
  return new NextRequest(`http://localhost/api/voice/webhook${agent ? `?agent=${agent}` : ''}`, { method: 'POST', body, headers });
}
const signed = (body: string) => ({ 'x-retell-signature': signRetellBody(body, SECRET, Date.now()) });

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  vi.stubEnv('VOICE_MODE', 'live');
  vi.stubEnv('RETELL_API_KEY', SECRET);
  findAgent.mockResolvedValue({ id: 'agt_1', workspaceId: 'ws-A', kind: 'voice' } as never);
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/voice/webhook', () => {
  it('en modo simulado no procesa nada (503)', async () => {
    vi.stubEnv('VOICE_MODE', 'simulated');
    const body = payload();
    expect((await POST(req(body, signed(body)))).status).toBe(503);
    expect(prismaVoiceStore.upsertConversation).not.toHaveBeenCalled();
  });

  it('firma ausente o inválida → 401 y no toca la base de datos', async () => {
    const body = payload();
    expect((await POST(req(body))).status).toBe(401);
    expect((await POST(req(body, { 'x-retell-signature': `v=${Date.now()},d=${'0'.repeat(64)}` }))).status).toBe(401);
    expect(findAgent).not.toHaveBeenCalled();
  });

  it('evento válido → 204 y se guarda con el workspace del agente (no del cuerpo)', async () => {
    const body = payload();
    const res = await POST(req(body, signed(body)));
    expect(res.status).toBe(204);
    expect(prismaVoiceStore.findOrCreateContact).toHaveBeenCalledWith('ws-A', '+584121234567', expect.any(String));
    expect(prismaVoiceStore.upsertConversation).toHaveBeenCalledWith(expect.objectContaining({ id: 'vc_call_1', agentId: 'agt_1', status: 'closed' }));
  });

  it('reintento del mismo evento → 204 y sin errores (idempotente por ids determinísticos)', async () => {
    const body = payload();
    const a = await POST(req(body, signed(body)));
    const b = await POST(req(body, signed(body)));
    expect([a.status, b.status]).toEqual([204, 204]);
    const ids = vi.mocked(prismaVoiceStore.upsertMessage).mock.calls.map((c) => c[0].id);
    expect(new Set(ids).size).toBe(1);
  });

  it('eventos que no procesamos se aceptan sin guardar', async () => {
    const body = payload('transcript_updated');
    expect((await POST(req(body, signed(body)))).status).toBe(204);
    expect(prismaVoiceStore.upsertConversation).not.toHaveBeenCalled();
  });

  it('agente desconocido, de chat o ausente → 404', async () => {
    const body = payload();
    findAgent.mockResolvedValue(null);
    expect((await POST(req(body, signed(body)))).status).toBe(404);
    findAgent.mockResolvedValue({ id: 'agt_1', workspaceId: 'ws-A', kind: 'chat' } as never);
    expect((await POST(req(body, signed(body)))).status).toBe(404);
    expect((await POST(req(body, signed(body), null))).status).toBe(404);
  });

  it('llamada de otro workspace → 409', async () => {
    vi.mocked(prismaVoiceStore.conversationWorkspace).mockResolvedValueOnce('ws-OTRO');
    const body = payload();
    expect((await POST(req(body, signed(body)))).status).toBe(409);
  });

  it('JSON inválido firmado → 400', async () => {
    const body = '{no json';
    expect((await POST(req(body, signed(body)))).status).toBe(400);
  });
});
