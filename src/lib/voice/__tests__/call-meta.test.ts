import { describe, expect, it } from 'vitest';
import { deriveOutcome, formatDuration, formatMetaMessage, metaFromRecord, parseMetaMessage } from '../call-meta';
import { normalizeRetellCall } from '../retell';
import { effectiveCap, monthRange, summarizeUsage } from '../usage';
import { DEFAULT_COST_ASSUMPTIONS } from '../cost';

const base = { status: 'ended', disconnectionReason: 'agent_hangup', inVoicemail: null, successful: null, durationSec: 60 } as const;

describe('deriveOutcome', () => {
  it('clasifica los casos principales', () => {
    expect(deriveOutcome({ ...base, status: 'ongoing' })).toBe('in_progress');
    expect(deriveOutcome({ ...base, disconnectionReason: 'call_transfer' })).toBe('transferred');
    expect(deriveOutcome({ ...base, inVoicemail: true })).toBe('voicemail');
    expect(deriveOutcome({ ...base, disconnectionReason: 'dial_no_answer' })).toBe('missed');
    expect(deriveOutcome({ ...base, disconnectionReason: 'user_hangup', durationSec: 1 })).toBe('missed');
    expect(deriveOutcome({ ...base, disconnectionReason: 'error_asr' })).toBe('error');
    expect(deriveOutcome({ ...base, disconnectionReason: 'credit_exhausted' })).toBe('error');
    expect(deriveOutcome({ ...base, successful: true })).toBe('resolved');
    expect(deriveOutcome({ ...base, successful: false })).toBe('unresolved');
    expect(deriveOutcome(base)).toBe('unknown');
  });
});

describe('mensaje de metadatos', () => {
  it('va y vuelve sin pérdida y es legible', () => {
    const call = normalizeRetellCall({ call_id: 'c9', duration_ms: 125_000, call_analysis: { call_summary: 'Pidió tarifas.', call_successful: true }, call_cost: { combined_cost: 12 } })!;
    const text = formatMetaMessage(metaFromRecord(call));
    expect(text.startsWith('Llamada de voz · 2 min 05 s · Resuelta')).toBe(true);
    expect(parseMetaMessage(text)).toEqual(metaFromRecord(call));
  });
  it('devuelve null si el texto no trae metadatos válidos', () => {
    expect(parseMetaMessage('hola')).toBeNull();
    expect(parseMetaMessage('[[voz:meta]]{no')).toBeNull();
    expect(parseMetaMessage('[[voz:meta]]{"v":2}')).toBeNull();
  });
  it('formatDuration', () => {
    expect(formatDuration(0)).toBe('0 s');
    expect(formatDuration(59)).toBe('59 s');
    expect(formatDuration(3600)).toBe('60 min 00 s');
  });
});

describe('uso mensual', () => {
  it('el mes se calcula en hora de Caracas (UTC-4)', () => {
    // 1 nov 02:00 UTC todavía es 31 oct en Caracas.
    expect(monthRange(new Date('2026-11-01T02:00:00Z')).label).toBe('2026-10');
    expect(monthRange(new Date('2026-11-01T05:00:00Z')).label).toBe('2026-11');
    expect(monthRange(new Date('2026-10-16T12:00:00Z')).startMs).toBe(Date.UTC(2026, 9, 1, 4));
  });

  it('suma costo real, estima el que falta, añade el número y compara con el tope', () => {
    const mk = (durationSec: number, costUsd: number | null) => ({ ...metaFromRecord(normalizeRetellCall({ call_id: `c${durationSec}`, duration_ms: durationSec * 1000 })!), costUsd });
    const u = summarizeUsage([mk(60, 0.2), mk(120, null)], { capUsd: 5, assumptions: DEFAULT_COST_ASSUMPTIONS, includeNumber: true, month: '2026-10' });
    expect(u.calls).toBe(2);
    expect(u.minutes).toBe(3);
    expect(u.reportedUsd).toBe(0.2);
    expect(u.estimatedUsd).toBeCloseTo(0.24, 2);
    expect(u.spentUsd).toBeCloseTo(0.2 + 0.24 + 1.15, 2);
    expect(u.level).toBe('ok');
    const over = summarizeUsage([mk(60, 9)], { capUsd: 5, assumptions: DEFAULT_COST_ASSUMPTIONS, includeNumber: false, month: 'x' });
    expect(over.level).toBe('cap');
  });

  it('el tope del workspace nunca supera el del entorno', () => {
    expect(effectiveCap(25, 100)).toBe(25);
    expect(effectiveCap(25, 10)).toBe(10);
    expect(effectiveCap(25, null)).toBe(25);
    expect(effectiveCap(25, 0)).toBe(25);
  });
});
