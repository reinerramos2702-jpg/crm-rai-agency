/**
 * Adaptador de Retell AI (https://api.retellai.com) con `fetch`, sin dependencias nuevas.
 * Endpoints verificados en docs.retellai.com el 16 oct 2026:
 *   POST /create-retell-llm · PATCH /update-retell-llm/{id} · POST /create-agent ·
 *   PATCH /update-agent/{id} · GET /get-agent/{id} · POST /v2/list-agents ·
 *   POST /v3/list-calls · GET /v2/get-call/{id} · POST /v3/create-web-call
 * Autenticación: `Authorization: Bearer <API key>`. La llave nunca se registra ni se incluye en errores.
 */
import type {
  ListCallsOptions, ProviderAgentRef, TranscriptTurn, VoiceAgentSpec, VoiceAgentTool, VoiceCallRecord,
  VoiceCallStatus, VoiceProvider, WebCallSession,
} from './types';

export const RETELL_BASE_URL = 'https://api.retellai.com';
const DEFAULT_TIMEOUT_MS = 15_000;

export class RetellError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'RetellError';
  }
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// ---------------------------------------------------------------------------
// Traducción de nuestra especificación a los cuerpos de Retell
// ---------------------------------------------------------------------------

export const KB_SECRET_HEADER = 'x-voice-kb-secret';

function toRetellTool(t: VoiceAgentTool): Json {
  if (t.kind === 'end_call') return { type: 'end_call', name: t.name, description: t.description };
  if (t.kind === 'transfer') {
    return {
      type: 'transfer_call',
      name: t.name,
      description: t.description,
      transfer_destination: { type: 'predefined', number: t.number },
      transfer_option: { type: 'cold_transfer', show_transferee_as_caller: false },
    };
  }
  return {
    type: 'custom',
    name: t.name,
    description: t.description,
    url: t.url,
    method: 'POST',
    headers: { [KB_SECRET_HEADER]: t.secret },
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'La pregunta de la persona, en una frase corta.' } },
      required: ['query'],
    },
    args_at_root: true,
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: 'Dile con naturalidad que estás revisando la información.',
    speak_after_execution: true,
    timeout_ms: 8000,
    max_retry: 1,
  };
}

export function toRetellLlmBody(spec: VoiceAgentSpec): Json {
  return {
    model: spec.model,
    model_temperature: 0.2,
    general_prompt: spec.prompt,
    begin_message: spec.beginMessage,
    start_speaker: 'agent',
    general_tools: spec.tools.map(toRetellTool),
  };
}

export function toRetellAgentBody(spec: VoiceAgentSpec, llmId: string): Json {
  return {
    response_engine: { type: 'retell-llm', llm_id: llmId },
    agent_name: spec.externalName,
    voice_id: spec.voiceId,
    language: spec.language,
    voice_speed: spec.voiceSpeed,
    webhook_url: spec.webhookUrl,
    webhook_events: ['call_started', 'call_ended', 'call_analyzed'],
    max_call_duration_ms: spec.maxCallMs,
    end_call_after_silence_ms: spec.endCallAfterSilenceMs,
    // Sin consentimiento de grabación, Retell conserva solo atributos básicos (sin audio ni transcripción).
    data_storage_setting: spec.recording ? 'everything' : 'basic_attributes_only',
    post_call_analysis_data: [
      { type: 'system-presets', name: 'call_summary' },
      { type: 'system-presets', name: 'call_successful' },
      { type: 'system-presets', name: 'user_sentiment' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Normalización de llamadas
// ---------------------------------------------------------------------------

const STATUSES: readonly VoiceCallStatus[] = ['registered', 'not_connected', 'ongoing', 'ended', 'error'];

function transcriptOf(raw: Json): TranscriptTurn[] {
  const list = raw.transcript_object;
  if (!Array.isArray(list)) return [];
  const out: TranscriptTurn[] = [];
  for (const u of list) {
    if (!isRecord(u)) continue;
    const content = str(u.content);
    if (!content) continue;
    out.push({ role: u.role === 'user' ? 'user' : 'agent', content });
  }
  return out;
}

/** Convierte el objeto `call` de Retell (webhook o API) en un registro normalizado. Nunca lanza. */
export function normalizeRetellCall(raw: unknown): VoiceCallRecord | null {
  if (!isRecord(raw)) return null;
  const callId = str(raw.call_id);
  if (!callId) return null;
  const analysis = isRecord(raw.call_analysis) ? raw.call_analysis : {};
  const cost = isRecord(raw.call_cost) ? raw.call_cost : {};
  const startMs = numOrNull(raw.start_timestamp);
  const endMs = numOrNull(raw.end_timestamp);
  const durationMs = numOrNull(raw.duration_ms);
  const costSeconds = numOrNull(cost.total_duration_seconds);
  const durationSec = Math.max(
    0,
    Math.round(durationMs !== null ? durationMs / 1000 : startMs !== null && endMs !== null ? (endMs - startMs) / 1000 : costSeconds ?? 0),
  );
  const cents = numOrNull(cost.combined_cost);
  const status = STATUSES.find((s) => s === raw.call_status) ?? 'ended';
  return {
    callId,
    providerAgentId: str(raw.agent_id),
    status,
    callType: raw.call_type === 'web_call' ? 'web_call' : raw.call_type === 'phone_call' ? 'phone_call' : 'unknown',
    direction: raw.direction === 'inbound' || raw.direction === 'outbound' ? raw.direction : null,
    fromNumber: str(raw.from_number),
    toNumber: str(raw.to_number),
    startMs,
    endMs,
    durationSec,
    // `combined_cost` viene en centavos de USD.
    costUsd: cents === null ? null : Math.round(cents * 100) / 10000,
    disconnectionReason: str(raw.disconnection_reason),
    summary: str(analysis.call_summary),
    sentiment: str(analysis.user_sentiment),
    successful: typeof analysis.call_successful === 'boolean' ? analysis.call_successful : null,
    inVoicemail: typeof analysis.in_voicemail === 'boolean' ? analysis.in_voicemail : null,
    recordingUrl: str(raw.recording_url),
    transcript: transcriptOf(raw),
  };
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export interface RetellOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class RetellProvider implements VoiceProvider {
  readonly name = 'retell';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;
  private readonly timeoutMs: number;

  constructor(opts: RetellOptions) {
    if (!opts.apiKey) throw new RetellError('Falta RETELL_API_KEY.', 0);
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? RETELL_BASE_URL).replace(/\/+$/, '');
    this.doFetch = opts.fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async request(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<unknown> {
    const qs = query
      ? Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
      : '';
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.doFetch(url, {
        method,
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctl.signal,
      });
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError';
      throw new RetellError(aborted ? 'Retell no respondió a tiempo.' : 'No se pudo contactar a Retell.', 0);
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const detail = isRecord(data) ? str(data.message) ?? str(data.error_message) ?? str(data.error) : null;
      throw new RetellError(`Retell respondió ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`, res.status);
    }
    return data;
  }

  async upsertAgent(spec: VoiceAgentSpec, existing?: ProviderAgentRef | null): Promise<ProviderAgentRef> {
    const ref = existing ?? (await this.findAgentByName(spec.externalName));
    if (ref) {
      await this.request('PATCH', `/update-retell-llm/${encodeURIComponent(ref.llmId)}`, toRetellLlmBody(spec));
      await this.request('PATCH', `/update-agent/${encodeURIComponent(ref.agentId)}`, toRetellAgentBody(spec, ref.llmId));
      return ref;
    }
    const llm = await this.request('POST', '/create-retell-llm', toRetellLlmBody(spec));
    const llmId = isRecord(llm) ? str(llm.llm_id) : null;
    if (!llmId) throw new RetellError('Retell no devolvió llm_id.', 502);
    const agent = await this.request('POST', '/create-agent', toRetellAgentBody(spec, llmId));
    const agentId = isRecord(agent) ? str(agent.agent_id) : null;
    if (!agentId) throw new RetellError('Retell no devolvió agent_id.', 502);
    return { agentId, llmId };
  }

  async findAgentByName(externalName: string): Promise<ProviderAgentRef | null> {
    let key: string | undefined;
    for (let page = 0; page < 5; page += 1) {
      const res = await this.request('POST', '/v2/list-agents', { filter_criteria: { channel: 'voice', query: externalName } }, { limit: 100, pagination_key: key });
      const items = isRecord(res) && Array.isArray(res.items) ? res.items : [];
      const hit = items.find((i): i is Json => isRecord(i) && i.agent_name === externalName);
      if (hit && str(hit.agent_id)) {
        const detail = await this.request('GET', `/get-agent/${encodeURIComponent(String(hit.agent_id))}`);
        const engine = isRecord(detail) && isRecord(detail.response_engine) ? detail.response_engine : null;
        const llmId = engine ? str(engine.llm_id) : null;
        return llmId ? { agentId: String(hit.agent_id), llmId } : null;
      }
      const next = isRecord(res) ? str(res.pagination_key) : null;
      if (!(isRecord(res) && res.has_more === true) || !next) return null;
      key = next;
    }
    return null;
  }

  async listCalls(opts: ListCallsOptions = {}): Promise<{ calls: VoiceCallRecord[]; nextKey: string | null }> {
    const filter: Json = {};
    if (opts.providerAgentId) filter.agent = [{ agent_id: opts.providerAgentId }];
    if (opts.sinceMs !== undefined) filter.start_timestamp = { ge: opts.sinceMs };
    const res = await this.request('POST', '/v3/list-calls', {
      filter_criteria: filter,
      sort_order: 'descending',
      limit: Math.min(Math.max(opts.limit ?? 50, 1), 200),
      ...(opts.paginationKey ? { pagination_key: opts.paginationKey } : {}),
    });
    const items = isRecord(res) && Array.isArray(res.items) ? res.items : [];
    const calls = items.map(normalizeRetellCall).filter((c): c is VoiceCallRecord => c !== null);
    const hasMore = isRecord(res) && res.has_more === true;
    return { calls, nextKey: hasMore && isRecord(res) ? str(res.pagination_key) : null };
  }

  async getCall(callId: string): Promise<VoiceCallRecord> {
    const res = await this.request('GET', `/v2/get-call/${encodeURIComponent(callId)}`);
    const call = normalizeRetellCall(res);
    if (!call) throw new RetellError('Respuesta de llamada inválida.', 502);
    return call;
  }

  async createWebCall(providerAgentId: string, metadata?: Record<string, string>): Promise<WebCallSession> {
    const res = await this.request('POST', '/v3/create-web-call', { agent_id: providerAgentId, ...(metadata ? { metadata } : {}) });
    const callId = isRecord(res) ? str(res.call_id) : null;
    const accessToken = isRecord(res) ? str(res.access_token) : null;
    if (!callId || !accessToken) throw new RetellError('Retell no devolvió el token de la llamada web.', 502);
    return { callId, accessToken, expiresAt: isRecord(res) ? numOrNull(res.expires_at) : null };
  }
}
