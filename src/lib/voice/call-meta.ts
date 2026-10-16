/**
 * Metadatos de una llamada guardados SIN migración: viajan en un mensaje del hilo
 * (`Message.id = vc_<callId>_meta`) como texto legible más una línea JSON al final.
 * DEUDA: pasar a una tabla `VoiceCall` (ver docs/planning/CATALOGO-GHL-DIAGNOSTICO.md §4.3).
 */
import type { VoiceCallRecord } from './types';

export type CallOutcome = 'resolved' | 'unresolved' | 'transferred' | 'voicemail' | 'missed' | 'error' | 'in_progress' | 'unknown';

export const OUTCOME_LABEL: Record<CallOutcome, string> = {
  resolved: 'Resuelta',
  unresolved: 'Sin resolver',
  transferred: 'Transferida',
  voicemail: 'Buzón de voz',
  missed: 'No contestada',
  error: 'Con error',
  in_progress: 'En curso',
  unknown: 'Sin clasificar',
};

export interface VoiceCallMeta {
  v: 1;
  callId: string;
  status: VoiceCallRecord['status'];
  webCall: boolean;
  from: string | null;
  to: string | null;
  startMs: number | null;
  endMs: number | null;
  durationSec: number;
  costUsd: number | null;
  reason: string | null;
  sentiment: string | null;
  successful: boolean | null;
  summary: string | null;
  outcome: CallOutcome;
}

const TRANSFER_REASONS = ['call_transfer', 'transfer_bridged'];
const MISSED_REASONS = ['dial_no_answer', 'dial_busy', 'dial_failed', 'invalid_destination'];

export function deriveOutcome(c: Pick<VoiceCallRecord, 'status' | 'disconnectionReason' | 'inVoicemail' | 'successful' | 'durationSec'>): CallOutcome {
  const reason = c.disconnectionReason ?? '';
  if (c.status === 'ongoing' || c.status === 'registered') return 'in_progress';
  if (TRANSFER_REASONS.includes(reason)) return 'transferred';
  if (c.inVoicemail === true || reason === 'voicemail_reached') return 'voicemail';
  if (c.status === 'not_connected' || MISSED_REASONS.includes(reason)) return 'missed';
  if (c.status === 'error' || reason.startsWith('error_') || ['concurrency_limit_reached', 'no_valid_payment', 'credit_exhausted', 'budget_reached', 'telephony_provider_unavailable', 'sip_routing_error'].includes(reason)) {
    return 'error';
  }
  if (c.durationSec < 3 && reason === 'user_hangup') return 'missed';
  if (c.successful === true) return 'resolved';
  if (c.successful === false) return 'unresolved';
  return 'unknown';
}

export function metaFromRecord(c: VoiceCallRecord): VoiceCallMeta {
  return {
    v: 1,
    callId: c.callId,
    status: c.status,
    webCall: c.callType === 'web_call',
    from: c.fromNumber,
    to: c.toNumber,
    startMs: c.startMs,
    endMs: c.endMs,
    durationSec: c.durationSec,
    costUsd: c.costUsd,
    reason: c.disconnectionReason,
    sentiment: c.sentiment,
    successful: c.successful,
    summary: c.summary,
    outcome: deriveOutcome(c),
  };
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
}

export const META_MARK = '[[voz:meta]]';

export function formatMetaMessage(meta: VoiceCallMeta): string {
  const head = `Llamada de voz${meta.webCall ? ' (prueba web)' : ''} · ${formatDuration(meta.durationSec)} · ${OUTCOME_LABEL[meta.outcome]}`;
  const lines = [head];
  if (meta.summary) lines.push(`Resumen: ${meta.summary}`);
  lines.push(`${META_MARK}${JSON.stringify(meta)}`);
  return lines.join('\n');
}

export function parseMetaMessage(body: string): VoiceCallMeta | null {
  const idx = body.lastIndexOf(META_MARK);
  if (idx < 0) return null;
  try {
    const v: unknown = JSON.parse(body.slice(idx + META_MARK.length).trim());
    if (typeof v !== 'object' || v === null) return null;
    const m = v as Partial<VoiceCallMeta>;
    if (m.v !== 1 || typeof m.callId !== 'string' || typeof m.durationSec !== 'number' || typeof m.outcome !== 'string') return null;
    return m as VoiceCallMeta;
  } catch {
    return null;
  }
}

/** Identificadores determinísticos: reintentos del webhook caen sobre las mismas filas (idempotencia). */
export const conversationIdFor = (callId: string): string => `vc_${callId}`;
export const metaMessageIdFor = (callId: string): string => `vc_${callId}_meta`;
export const turnMessageIdFor = (callId: string, index: number): string => `vc_${callId}_t${index}`;
