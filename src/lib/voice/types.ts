/**
 * Tipos compartidos de la capa de voz. Son neutrales respecto al proveedor:
 * el CRM construye un `VoiceAgentSpec` y cada adaptador (hoy Retell) lo traduce.
 */

/** `simulated` = cero gasto, nada sale a internet. `live` = llama al proveedor real. */
export type VoiceMode = 'simulated' | 'live';

export type VoiceAgentTool =
  | { kind: 'end_call'; name: string; description: string }
  | { kind: 'transfer'; name: string; description: string; number: string }
  | { kind: 'knowledge'; name: string; description: string; url: string; secret: string };

/** Configuración completa de un agente de voz, lista para enviarse al proveedor. */
export interface VoiceAgentSpec {
  /** Nombre estable en el proveedor (`rai:<id del agente del CRM>`), clave para reencontrarlo. */
  externalName: string;
  prompt: string;
  beginMessage: string;
  /** Código de idioma del proveedor (p. ej. `es-419`). */
  language: string;
  voiceId: string;
  voiceSpeed: number;
  model: string;
  maxCallMs: number;
  endCallAfterSilenceMs: number;
  /** URL pública que recibe los eventos de llamada (incluye `?agent=`). */
  webhookUrl: string;
  tools: VoiceAgentTool[];
  /** Grabación y transcripción: si es false, solo se guardan atributos básicos. */
  recording: boolean;
}

export interface ProviderAgentRef {
  agentId: string;
  llmId: string;
}

export type VoiceCallStatus = 'registered' | 'not_connected' | 'ongoing' | 'ended' | 'error';
export type TranscriptRole = 'agent' | 'user';

export interface TranscriptTurn {
  role: TranscriptRole;
  content: string;
}

/** Llamada normalizada (independiente del proveedor). */
export interface VoiceCallRecord {
  callId: string;
  providerAgentId: string | null;
  status: VoiceCallStatus;
  callType: 'phone_call' | 'web_call' | 'unknown';
  direction: 'inbound' | 'outbound' | null;
  fromNumber: string | null;
  toNumber: string | null;
  startMs: number | null;
  endMs: number | null;
  durationSec: number;
  /** Costo real reportado por el proveedor, en USD (null si aún no llega). */
  costUsd: number | null;
  disconnectionReason: string | null;
  summary: string | null;
  sentiment: string | null;
  successful: boolean | null;
  inVoicemail: boolean | null;
  recordingUrl: string | null;
  transcript: TranscriptTurn[];
}

export interface ListCallsOptions {
  sinceMs?: number;
  limit?: number;
  paginationKey?: string | null;
  providerAgentId?: string | null;
}

export interface WebCallSession {
  callId: string;
  accessToken: string;
  expiresAt: number | null;
}

export interface VoiceProvider {
  readonly name: string;
  /** Crea o actualiza (idempotente) el agente y su LLM en el proveedor. */
  upsertAgent(spec: VoiceAgentSpec, existing?: ProviderAgentRef | null): Promise<ProviderAgentRef>;
  /** Busca un agente por su `externalName`. */
  findAgentByName(externalName: string): Promise<ProviderAgentRef | null>;
  listCalls(opts?: ListCallsOptions): Promise<{ calls: VoiceCallRecord[]; nextKey: string | null }>;
  getCall(callId: string): Promise<VoiceCallRecord>;
  /** Opcional: sesión de prueba desde el navegador (requiere el SDK web del proveedor en el cliente). */
  createWebCall?(providerAgentId: string, metadata?: Record<string, string>): Promise<WebCallSession>;
}

/** Eventos de llamada que el CRM procesa. */
export const VOICE_EVENTS = ['call_started', 'call_ended', 'call_analyzed'] as const;
export type VoiceEventName = (typeof VOICE_EVENTS)[number];
