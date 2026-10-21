import { describe, expect, it, vi } from 'vitest';
import { RetellError, RetellProvider, normalizeRetellCall, toRetellAgentBody, toRetellLlmBody, KB_SECRET_HEADER } from '../retell';
import type { VoiceAgentSpec } from '../types';

const SPEC: VoiceAgentSpec = {
  externalName: 'rai:agt_1',
  prompt: 'Eres un agente.',
  beginMessage: 'Hola.',
  language: 'es-419',
  voiceId: 'voice_abc',
  voiceSpeed: 1,
  model: 'gpt-4.1-mini',
  maxCallMs: 480_000,
  endCallAfterSilenceMs: 20_000,
  webhookUrl: 'https://crm.example.com/api/voice/webhook?agent=agt_1',
  recording: false,
  tools: [
    { kind: 'end_call', name: 'finalizar_llamada', description: 'x' },
    { kind: 'transfer', name: 'transferir_a_humano', description: 'x', number: '+584121234567' },
    { kind: 'knowledge', name: 'buscar_conocimiento', description: 'x', url: 'https://crm.example.com/api/voice/kb-search?agent=agt_1', secret: 'sec-123456789012345' },
  ],
};

function mockFetch(responses: Array<{ status?: number; body?: unknown }>) {
  const calls: Array<{ url: string; method: string; body: unknown; auth: string | null }> = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const r = responses.shift() ?? { status: 500, body: { message: 'sin respuesta simulada' } };
    calls.push({
      url: String(input),
      method: String(init?.method),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: (init?.headers as Record<string, string>)?.Authorization ?? null,
    });
    return new Response(r.body === undefined ? '' : JSON.stringify(r.body), { status: r.status ?? 200 });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}
const provider = (f: typeof fetch) => new RetellProvider({ apiKey: 'key_secret_value', fetchImpl: f });

describe('traducción a Retell', () => {
  it('el LLM lleva el prompt, el saludo y las tres herramientas con sus tipos', () => {
    const llm = toRetellLlmBody(SPEC) as { general_tools: Array<Record<string, unknown>>; begin_message: string; start_speaker: string };
    expect(llm.begin_message).toBe('Hola.');
    expect(llm.start_speaker).toBe('agent');
    expect(llm.general_tools.map((t) => t.type)).toEqual(['end_call', 'transfer_call', 'custom']);
    const transfer = llm.general_tools[1] as { transfer_destination: unknown };
    expect(transfer.transfer_destination).toEqual({ type: 'predefined', number: '+584121234567' });
    const kb = llm.general_tools[2] as { headers: Record<string, string>; args_at_root: boolean };
    expect(kb.headers[KB_SECRET_HEADER]).toBe('sec-123456789012345');
    expect(kb.args_at_root).toBe(true);
  });

  it('el agente apunta al LLM, al webhook por agente y limita el almacenamiento sin consentimiento', () => {
    const a = toRetellAgentBody(SPEC, 'llm_1') as Record<string, unknown>;
    expect(a.response_engine).toEqual({ type: 'retell-llm', llm_id: 'llm_1' });
    expect(a.webhook_url).toBe(SPEC.webhookUrl);
    expect(a.data_storage_setting).toBe('basic_attributes_only');
    expect((toRetellAgentBody({ ...SPEC, recording: true }, 'llm_1') as Record<string, unknown>).data_storage_setting).toBe('everything');
  });
});

describe('RetellProvider', () => {
  it('crea LLM y agente cuando no existen (llave en cabecera, nunca en el cuerpo)', async () => {
    const { impl, calls } = mockFetch([
      { body: { items: [], has_more: false } },
      { status: 201, body: { llm_id: 'llm_1' } },
      { status: 201, body: { agent_id: 'agent_1' } },
    ]);
    const ref = await provider(impl).upsertAgent(SPEC);
    expect(ref).toEqual({ agentId: 'agent_1', llmId: 'llm_1' });
    expect(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual(['POST /v2/list-agents', 'POST /create-retell-llm', 'POST /create-agent']);
    expect(calls.every((c) => c.auth === 'Bearer key_secret_value')).toBe(true);
    expect(JSON.stringify(calls.map((c) => c.body))).not.toContain('key_secret_value');
  });

  it('actualiza (sin duplicar) si el agente ya existe en el proveedor', async () => {
    const { impl, calls } = mockFetch([
      { body: { items: [{ agent_id: 'agent_1', agent_name: 'rai:agt_1' }], has_more: false } },
      { body: { agent_id: 'agent_1', response_engine: { type: 'retell-llm', llm_id: 'llm_1' } } },
      { body: { llm_id: 'llm_1' } },
      { body: { agent_id: 'agent_1' } },
    ]);
    const ref = await provider(impl).upsertAgent(SPEC);
    expect(ref).toEqual({ agentId: 'agent_1', llmId: 'llm_1' });
    expect(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual([
      'POST /v2/list-agents', 'GET /get-agent/agent_1', 'PATCH /update-retell-llm/llm_1', 'PATCH /update-agent/agent_1',
    ]);
  });

  it('un error del proveedor no filtra la llave y conserva el estado HTTP', async () => {
    const { impl } = mockFetch([{ status: 401, body: { message: 'Unauthorized' } }]);
    const err = await provider(impl).findAgentByName('rai:x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RetellError);
    expect((err as RetellError).status).toBe(401);
    expect((err as RetellError).message).not.toContain('key_secret_value');
  });

  it('un fallo de red se informa sin detalles internos', async () => {
    const impl = vi.fn(async () => { throw new Error('ECONNRESET key_secret_value'); }) as unknown as typeof fetch;
    const err = await provider(impl).getCall('call_1').catch((e: unknown) => e);
    expect((err as RetellError).message).toBe('No se pudo contactar a Retell.');
  });

  it('listCalls filtra por agente y fecha, y normaliza la respuesta', async () => {
    const { impl, calls } = mockFetch([{ body: { items: [{ call_id: 'c1', call_status: 'ended', duration_ms: 61_000, call_cost: { combined_cost: 7 } }], has_more: true, pagination_key: 'k2' } }]);
    const out = await provider(impl).listCalls({ providerAgentId: 'agent_1', sinceMs: 1000, limit: 10 });
    expect(out.nextKey).toBe('k2');
    expect(out.calls[0]).toMatchObject({ callId: 'c1', durationSec: 61, costUsd: 0.07 });
    expect(calls[0].body).toMatchObject({ filter_criteria: { agent: [{ agent_id: 'agent_1' }], start_timestamp: { ge: 1000 } }, limit: 10 });
  });

  it('createWebCall devuelve el token de acceso', async () => {
    const { impl, calls } = mockFetch([{ status: 201, body: { call_id: 'w1', access_token: 'tok', expires_at: 1234 } }]);
    const s = await provider(impl).createWebCall!('agent_1', { crm: 'x' });
    expect(s).toEqual({ callId: 'w1', accessToken: 'tok', expiresAt: 1234 });
    expect(new URL(calls[0].url).pathname).toBe('/v3/create-web-call');
  });

  it('exige llave', () => {
    expect(() => new RetellProvider({ apiKey: '' })).toThrow(RetellError);
  });
});

describe('normalizeRetellCall', () => {
  it('descarta basura sin lanzar y deriva la duración de las marcas si falta duration_ms', () => {
    expect(normalizeRetellCall(null)).toBeNull();
    expect(normalizeRetellCall({})).toBeNull();
    const c = normalizeRetellCall({ call_id: 'x', start_timestamp: 1000, end_timestamp: 31_000, transcript_object: [{ role: 'user', content: 'hola' }, { role: 'x' }] })!;
    expect(c.durationSec).toBe(30);
    expect(c.transcript).toEqual([{ role: 'user', content: 'hola' }]);
    expect(c.costUsd).toBeNull();
  });
});
