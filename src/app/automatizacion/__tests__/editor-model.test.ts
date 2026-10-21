import { describe, expect, it } from 'vitest';
import { isRecord, isRunsPayload, isTriggerType, isWorkflowResponse, pickOption } from '../guards';
import { parseWorkflowDetail } from '../[id]/parse-detail';
import { defaultsForFields, newStep, summarizeStep } from '../[id]/step-model';

describe('guardas', () => {
  it('reconocen disparadores y respuestas válidas', () => {
    expect(isTriggerType('contact.created')).toBe(true);
    expect(isTriggerType('toString')).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isWorkflowResponse({ workflow: { id: 'a' } })).toBe(true);
    expect(isWorkflowResponse({ workflow: {} })).toBe(false);
    expect(isRunsPayload({ runs: [], nextCursor: null })).toBe(true);
    expect(isRunsPayload({ runs: [] })).toBe(false);
  });
  it('pickOption solo devuelve opciones permitidas', () => {
    expect(pickOption(['a', 'b'] as const, 'b')).toBe('b');
    expect(pickOption(['a', 'b'] as const, 'c')).toBeUndefined();
  });
});

describe('parseWorkflowDetail', () => {
  it('normaliza un flujo válido', () => {
    const wf = parseWorkflowDetail({
      workflow: {
        id: 'w1',
        name: 'Bienvenida',
        description: null,
        folderId: null,
        status: 'active',
        trigger: { type: 'contact.created', config: {} },
        steps: [{ id: 's1', type: 'delay', config: { amount: 2, unit: 'days' } }, { id: 'x', type: 'otro', config: {} }],
        runs: [{ id: 'r1', status: 'error', error: 'falló', createdAt: '2026-10-12T10:00:00Z' }, { id: 5 }],
      },
    });
    expect(wf?.steps).toHaveLength(1);
    expect(wf?.runs).toHaveLength(1);
    expect(wf?.trigger.type).toBe('contact.created');
  });
  it('rechaza respuestas con otra forma', () => {
    expect(parseWorkflowDetail({})).toBeNull();
    expect(parseWorkflowDetail({ workflow: { id: 1 } })).toBeNull();
  });
});

describe('pasos del editor', () => {
  it('crea pasos con valores iniciales', () => {
    expect(newStep('delay').config).toEqual({ amount: 1, unit: 'hours' });
    expect(newStep('condition').type).toBe('condition');
    expect(defaultsForFields([{ key: 'a', label: 'A', type: 'text' }])).toEqual({ a: '' });
  });
  it('resume cada paso en una línea', () => {
    expect(summarizeStep({ id: '1', type: 'delay', config: { amount: 1, unit: 'hours' } })).toBe('Esperar 1 hora');
    expect(summarizeStep({ id: '2', type: 'delay', config: { amount: 3, unit: 'days' } })).toBe('Esperar 3 días');
  });
});
