/** Lista de activación del centro de voz: qué falta para pasar de simulado a llamadas reales. */
import type { PublicVoiceConfig } from './config';

export type StepState = 'ok' | 'todo' | 'manual';
export type StepId = 'llaves' | 'numero' | 'webhook' | 'prueba';

export interface ChecklistItem {
  id: string;
  step: StepId;
  label: string;
  state: StepState;
  detail: string;
}

export interface StepSummary {
  id: StepId;
  label: string;
  state: StepState;
}

export interface ActivationInput {
  config: PublicVoiceConfig;
  /** Llamadas de voz ya guardadas en el CRM (reales o de prueba). */
  callsTotal: number;
  /** URL base del webhook (sin `?agent=`), si se conoce. */
  webhookBase: string | null;
}

export interface ActivationStatus {
  mode: PublicVoiceConfig['mode'];
  requestedMode: PublicVoiceConfig['requestedMode'];
  items: ChecklistItem[];
  steps: StepSummary[];
  missingEnv: string[];
  /** Todo lo que depende del entorno está listo (el número es manual y no cuenta). */
  envReady: boolean;
  webhookUrl: string | null;
}

const STEP_LABEL: Record<StepId, string> = { llaves: 'Llaves', numero: 'Número', webhook: 'Webhook', prueba: 'Prueba' };
const STEP_ORDER: StepId[] = ['llaves', 'numero', 'webhook', 'prueba'];

export function buildActivationChecklist({ config: c, callsTotal, webhookBase }: ActivationInput): ActivationStatus {
  const missing: string[] = [];
  const need = (name: string, ok: boolean) => {
    if (!ok) missing.push(name);
    return ok;
  };

  const items: ChecklistItem[] = [];
  const add = (item: ChecklistItem) => items.push(item);

  const hasKey = need('RETELL_API_KEY', c.hasApiKey);
  add({
    id: 'api-key', step: 'llaves', label: 'Llave de Retell', state: hasKey ? 'ok' : 'todo',
    detail: hasKey ? 'RETELL_API_KEY configurada.' : 'Crea la cuenta en Retell y copia la API key en RETELL_API_KEY.',
  });
  const isLive = need('VOICE_MODE=live', c.requestedMode === 'live');
  add({
    id: 'mode', step: 'llaves', label: 'Modo en vivo', state: isLive ? 'ok' : 'todo',
    detail: isLive ? 'VOICE_MODE=live.' : 'Sigue en modo simulado (cero gasto). Cambia VOICE_MODE a live solo cuando todo lo demás esté listo.',
  });
  const kbOk = need('VOICE_KB_SECRET', c.hasKbSecret && c.kbSecretStrong);
  add({
    id: 'kb-secret', step: 'llaves', label: 'Secreto de la herramienta de conocimiento', state: kbOk ? 'ok' : 'todo',
    detail: kbOk ? 'VOICE_KB_SECRET configurado.' : 'Define VOICE_KB_SECRET con al menos 16 caracteres aleatorios.',
  });
  const voiceOk = need('RETELL_VOICE_ID', c.hasDefaultVoice);
  add({
    id: 'voice-id', step: 'llaves', label: 'Voz por defecto', state: voiceOk ? 'ok' : 'todo',
    detail: voiceOk ? 'RETELL_VOICE_ID configurada.' : 'Elige una voz en español en el panel de Retell y pon su voice_id en RETELL_VOICE_ID.',
  });

  add({
    id: 'phone', step: 'numero', label: 'Número telefónico', state: callsTotal > 0 ? 'ok' : 'manual',
    detail: callsTotal > 0
      ? 'Ya hay llamadas registradas: el número funciona.'
      : 'Paso manual: comprar o conectar el número y asignarle el agente en Retell (ver docs/planning/VOZ-VENEZUELA-LEGAL.md).',
  });

  const httpsOk = need('VOICE_PUBLIC_URL (https)', c.publicUrlIsHttps);
  add({
    id: 'public-url', step: 'webhook', label: 'URL pública del CRM (https)', state: httpsOk ? 'ok' : 'todo',
    detail: httpsOk ? 'URL pública válida.' : 'Define VOICE_PUBLIC_URL con el dominio https de producción; Retell bloquea localhost.',
  });
  add({
    id: 'webhook-secret', step: 'webhook', label: 'Firma del webhook', state: c.hasWebhookSecret ? 'ok' : 'todo',
    detail: c.hasWebhookSecret
      ? 'Las llamadas se verifican con la llave de Retell (o VOICE_WEBHOOK_SECRET).'
      : 'Sin llave no se pueden verificar las firmas. Usa la API key con la insignia de webhook.',
  });
  const webhookUrl = httpsOk && webhookBase ? `${webhookBase}/api/voice/webhook` : null;

  add({
    id: 'test-call', step: 'prueba', label: 'Llamada de prueba', state: callsTotal > 0 ? 'ok' : 'todo',
    detail: callsTotal > 0 ? `${callsTotal} llamada(s) registrada(s).` : 'Llama al número una vez activado el agente. Mientras tanto usa el simulador de texto.',
  });

  const steps: StepSummary[] = STEP_ORDER.map((id) => {
    const own = items.filter((i) => i.step === id);
    const state: StepState = own.every((i) => i.state === 'ok') ? 'ok' : own.some((i) => i.state === 'todo') ? 'todo' : 'manual';
    return { id, label: STEP_LABEL[id], state };
  });

  const envReady = items.filter((i) => i.step === 'llaves' || i.step === 'webhook').every((i) => i.state === 'ok');
  return { mode: c.mode, requestedMode: c.requestedMode, items, steps, missingEnv: missing, envReady, webhookUrl };
}
