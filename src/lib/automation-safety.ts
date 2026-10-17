/** Seguridad útil sin esquema: qué flujos envían mensajes reales y qué riesgos tiene la configuración actual. */

import { TRIGGER_META } from './automations/ui-meta';
import { WEBHOOK_CHANNELS, type TriggerType, type WorkflowStep } from './automations/types';

export interface FlowLike {
  id?: string;
  name?: string;
  status: string;
  trigger?: { type: TriggerType | string } | null;
  steps?: WorkflowStep[] | null;
  lastRunStatus?: string | null;
}

export interface FlowRisk {
  /** Tiene al menos un paso «Enviar notificación» (mensajes reales a clientes por n8n). */
  sendsMessages: boolean;
  messageSteps: number;
  channels: string[];
  empty: boolean;
  /** Disparador programado (se evalúa en bucle) que envía sin condición «NO TIENE la etiqueta». */
  repeatRisk: boolean;
}

const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(WEBHOOK_CHANNELS.map((c) => [c.value, c.label]));

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

export function analyzeFlow(flow: FlowLike): FlowRisk {
  const steps = flow.steps ?? [];
  const sends = steps.filter((s) => s.type === 'action' && s.config?.action === 'send_webhook');
  const channels: string[] = [];
  for (const s of sends) {
    const channel = String(s.config.channel || 'whatsapp');
    if (!channels.includes(channel)) channels.push(channel);
  }
  const timed = TRIGGER_META[flow.trigger?.type as TriggerType]?.category === 'tiempo';
  const guarded = steps.some((s) => s.type === 'condition' && s.config?.check === 'tag_not_includes');
  return {
    sendsMessages: sends.length > 0,
    messageSteps: sends.length,
    channels,
    empty: steps.length === 0,
    repeatRisk: sends.length > 0 && timed && !guarded,
  };
}

/** ¿Hay que pedir confirmación antes de activar este flujo? */
export function needsActivationConfirm(flow: FlowLike): boolean {
  return flow.status !== 'active' && analyzeFlow(flow).sendsMessages;
}

export type RiskLevel = 'high' | 'medium' | 'info';

export interface RiskItem {
  id: string;
  level: RiskLevel;
  text: string;
}

export interface RiskInputs {
  automationsEnabled: boolean;
  webhookConfigured: boolean;
  hasNotifyEmail: boolean;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Resumen de riesgos de la configuración actual, de más a menos grave. Vacío = todo en orden. */
export function summarizeRisks(flows: FlowLike[], inputs: RiskInputs): RiskItem[] {
  const active = flows.filter((f) => f.status === 'active');
  const analyzed = active.map((f) => ({ flow: f, risk: analyzeFlow(f) }));
  const sending = analyzed.filter((a) => a.risk.sendsMessages);
  const items: RiskItem[] = [];

  if (sending.length > 0 && !inputs.webhookConfigured) {
    items.push({
      id: 'webhook-missing',
      level: 'high',
      text: `${plural(sending.length, 'flujo activo envía', 'flujos activos envían')} mensajes, pero no hay webhook de n8n: esos pasos se omiten y nadie recibe nada.`,
    });
  }
  const emptyActive = analyzed.filter((a) => a.risk.empty).length;
  if (emptyActive > 0) {
    items.push({ id: 'empty', level: 'medium', text: `${plural(emptyActive, 'flujo activo no tiene', 'flujos activos no tienen')} pasos: se ejecutan sin hacer nada.` });
  }
  const failing = active.filter((f) => f.lastRunStatus === 'error').length;
  if (failing > 0) {
    items.push({ id: 'failing', level: 'medium', text: `${plural(failing, 'flujo activo terminó', 'flujos activos terminaron')} con error en su última ejecución. Revisa Actividad.` });
  }
  const repeat = analyzed.filter((a) => a.risk.repeatRisk).length;
  if (repeat > 0) {
    items.push({
      id: 'repeat',
      level: 'medium',
      text: `${plural(repeat, 'flujo programado envía', 'flujos programados envían')} mensajes sin condición «NO TIENE la etiqueta». El motor evita repetir al mismo contacto durante 6 h; pasado ese plazo podría volver a escribirle.`,
    });
  }
  if (!inputs.automationsEnabled && active.length > 0) {
    items.push({ id: 'paused', level: 'info', text: `El motor está pausado: ${plural(active.length, 'flujo activo no se ejecuta', 'flujos activos no se ejecutan')} hasta que lo reactives.` });
  }
  if (sending.length > 0 && inputs.webhookConfigured && inputs.automationsEnabled) {
    items.push({ id: 'live-sends', level: 'info', text: `${plural(sending.length, 'flujo activo escribe', 'flujos activos escriben')} a clientes reales. Pausar el motor los detiene todos a la vez.` });
  }
  if (sending.length > 0 && !inputs.hasNotifyEmail) {
    items.push({ id: 'no-email', level: 'info', text: 'No hay correo de avisos: nadie recibe resumen si un flujo falla.' });
  }
  const order: Record<RiskLevel, number> = { high: 0, medium: 1, info: 2 };
  return items.sort((a, b) => order[a.level] - order[b.level]);
}
