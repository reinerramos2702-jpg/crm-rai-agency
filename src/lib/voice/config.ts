/**
 * Lectura de la configuración de voz desde variables de entorno.
 * Regla de oro: NUNCA se registra ni se devuelve el valor de un secreto; solo si existe.
 */
import type { VoiceMode } from './types';

type Env = Record<string, string | undefined>;

export interface VoiceConfig {
  /** Lo que pidió el entorno (`VOICE_MODE`). */
  requestedMode: VoiceMode;
  /** Modo efectivo: `live` solo si se pidió y hay llave del proveedor. */
  mode: VoiceMode;
  retellApiKey: string | null;
  /** Llave con la que se verifica la firma del webhook (por defecto, la misma API key). */
  webhookSecret: string | null;
  /** Secreto compartido de la herramienta `buscar_conocimiento`. */
  kbSecret: string | null;
  /** Base pública (https) del CRM, sin barra final. */
  publicBaseUrl: string | null;
  /** Voz por defecto del proveedor (el panel de Retell la muestra como `voice_id`). */
  defaultVoiceId: string | null;
  llmModel: string;
  /** Tope duro mensual (USD) del entorno: ningún ajuste del workspace puede superarlo. */
  monthlyCapUsd: number;
}

export const DEFAULT_LLM_MODEL = 'gpt-4.1-mini';
export const DEFAULT_MONTHLY_CAP_USD = 25;
export const MIN_SECRET_LENGTH = 16;

const clean = (v: string | undefined): string | null => {
  const t = (v ?? '').trim();
  return t ? t : null;
};

function positiveNumber(v: string | undefined, fallback: number): number {
  const n = Number((v ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function baseUrl(env: Env): string | null {
  const explicit = clean(env.VOICE_PUBLIC_URL) ?? clean(env.NEXT_PUBLIC_APP_URL);
  const vercel = clean(env.VERCEL_PROJECT_PRODUCTION_URL) ?? clean(env.VERCEL_URL);
  const raw = explicit ?? (vercel ? `https://${vercel}` : null);
  return raw ? raw.replace(/\/+$/, '') : null;
}

export function readVoiceConfig(env: Env = process.env): VoiceConfig {
  const requestedMode: VoiceMode = clean(env.VOICE_MODE)?.toLowerCase() === 'live' ? 'live' : 'simulated';
  const retellApiKey = clean(env.RETELL_API_KEY);
  return {
    requestedMode,
    mode: requestedMode === 'live' && retellApiKey ? 'live' : 'simulated',
    retellApiKey,
    webhookSecret: clean(env.VOICE_WEBHOOK_SECRET) ?? retellApiKey,
    kbSecret: clean(env.VOICE_KB_SECRET),
    publicBaseUrl: baseUrl(env),
    defaultVoiceId: clean(env.RETELL_VOICE_ID),
    llmModel: clean(env.RETELL_LLM_MODEL) ?? DEFAULT_LLM_MODEL,
    monthlyCapUsd: positiveNumber(env.VOICE_MONTHLY_CAP_USD, DEFAULT_MONTHLY_CAP_USD),
  };
}

/** Versión segura para mostrar en la interfaz: solo booleanos y valores no secretos. */
export interface PublicVoiceConfig {
  requestedMode: VoiceMode;
  mode: VoiceMode;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  hasKbSecret: boolean;
  kbSecretStrong: boolean;
  publicBaseUrl: string | null;
  publicUrlIsHttps: boolean;
  hasDefaultVoice: boolean;
  llmModel: string;
  monthlyCapUsd: number;
}

export function toPublicConfig(cfg: VoiceConfig): PublicVoiceConfig {
  return {
    requestedMode: cfg.requestedMode,
    mode: cfg.mode,
    hasApiKey: !!cfg.retellApiKey,
    hasWebhookSecret: !!cfg.webhookSecret,
    hasKbSecret: !!cfg.kbSecret,
    kbSecretStrong: (cfg.kbSecret?.length ?? 0) >= MIN_SECRET_LENGTH,
    publicBaseUrl: cfg.publicBaseUrl,
    publicUrlIsHttps: !!cfg.publicBaseUrl && cfg.publicBaseUrl.startsWith('https://'),
    hasDefaultVoice: !!cfg.defaultVoiceId,
    llmModel: cfg.llmModel,
    monthlyCapUsd: cfg.monthlyCapUsd,
  };
}

/** URL del webhook de un agente concreto (la que se registra en el proveedor). */
export function webhookUrlFor(cfg: Pick<VoiceConfig, 'publicBaseUrl'>, crmAgentId: string): string | null {
  return cfg.publicBaseUrl ? `${cfg.publicBaseUrl}/api/voice/webhook?agent=${encodeURIComponent(crmAgentId)}` : null;
}

export function kbToolUrlFor(cfg: Pick<VoiceConfig, 'publicBaseUrl'>, crmAgentId: string): string | null {
  return cfg.publicBaseUrl ? `${cfg.publicBaseUrl}/api/voice/kb-search?agent=${encodeURIComponent(crmAgentId)}` : null;
}
