import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({ prisma: { aIAgent: { findUnique: vi.fn() }, knowledgeBaseItem: { findMany: vi.fn() } } }));

import { prisma } from '@/lib/db';
import { resetRateLimits } from '@/lib/rate-limit';
import { POST } from './route';

const SECRET = 'secreto-compartido-123456';
const findAgent = vi.mocked(prisma.aIAgent.findUnique);
const findItems = vi.mocked(prisma.knowledgeBaseItem.findMany);

const req = (body: unknown, headers: Record<string, string> = { 'x-voice-kb-secret': SECRET }, agent = 'agt_1') =>
  new NextRequest(`http://localhost/api/voice/kb-search?agent=${agent}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers });

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  vi.stubEnv('VOICE_KB_SECRET', SECRET);
  findAgent.mockResolvedValue({ workspaceId: 'ws-A', kind: 'voice' } as never);
  findItems.mockResolvedValue([
    { id: 'f1', type: 'faq', question: '¿Cuál es el horario?', answer: 'De lunes a viernes de 8 a 18.', title: null, content: null, data: null },
  ] as never);
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/voice/kb-search', () => {
  it('sin secreto configurado → 503; secreto incorrecto o ausente → 401 sin tocar la base', async () => {
    vi.stubEnv('VOICE_KB_SECRET', '');
    expect((await POST(req({ query: 'horario' }))).status).toBe(503);
    vi.stubEnv('VOICE_KB_SECRET', SECRET);
    expect((await POST(req({ query: 'horario' }, {}))).status).toBe(401);
    expect((await POST(req({ query: 'horario' }, { 'x-voice-kb-secret': 'mal' }))).status).toBe(401);
    expect(findAgent).not.toHaveBeenCalled();
  });

  it('acepta el secreto también como Bearer', async () => {
    expect((await POST(req({ query: 'horario' }, { authorization: `Bearer ${SECRET}` }))).status).toBe(200);
  });

  it('busca solo en las bases vinculadas al agente de ese workspace y devuelve fragmentos cortos', async () => {
    const res = await POST(req({ query: '¿A qué hora abren? horario' }));
    const json = await res.json();
    expect(json.found).toBe(true);
    expect(json.results[0].text).toContain('lunes a viernes');
    expect(findItems).toHaveBeenCalledWith(expect.objectContaining({
      where: { knowledgeBase: { workspaceId: 'ws-A', triggers: { some: { agentId: 'agt_1' } } } },
    }));
  });

  it('acepta el cuerpo con envoltorio { args: { query } }', async () => {
    const json = await (await POST(req({ name: 'buscar_conocimiento', args: { query: 'horario' } }))).json();
    expect(json.found).toBe(true);
  });

  it('sin coincidencias indica no inventar', async () => {
    const json = await (await POST(req({ query: 'astronomía' }))).json();
    expect(json.found).toBe(false);
    expect(json.note).toContain('No inventes');
  });

  it('valida consulta, JSON y agente', async () => {
    expect((await POST(req({ query: '  ' }))).status).toBe(400);
    expect((await POST(req('{no'))).status).toBe(400);
    findAgent.mockResolvedValue(null);
    expect((await POST(req({ query: 'horario' }))).status).toBe(404);
    findAgent.mockResolvedValue({ workspaceId: 'ws-A', kind: 'chat' } as never);
    expect((await POST(req({ query: 'horario' }))).status).toBe(404);
  });

  it('limita la frecuencia por agente (429)', async () => {
    let last = 200;
    for (let i = 0; i < 121; i += 1) last = (await POST(req({ query: 'horario' }))).status;
    expect(last).toBe(429);
  });
});
