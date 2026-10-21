import { describe, expect, it } from 'vitest';
import { analyzeFlow, needsActivationConfirm, summarizeRisks, channelLabel } from '../automation-safety';
import type { WorkflowStep } from '../automations/types';

const send = (channel?: string): WorkflowStep => ({ id: 's', type: 'action', config: { action: 'send_webhook', ...(channel ? { channel } : {}) } });
const tagGuard: WorkflowStep = { id: 'g', type: 'condition', config: { check: 'tag_not_includes', tag: 'x' } };
const note: WorkflowStep = { id: 'n', type: 'action', config: { action: 'create_note', body: 'hola' } };

describe('analyzeFlow', () => {
  it('detecta envíos, canales y flujos vacíos', () => {
    const r = analyzeFlow({ status: 'draft', trigger: { type: 'contact.created' }, steps: [send(), send('slack'), send('slack')] });
    expect(r.sendsMessages).toBe(true);
    expect(r.messageSteps).toBe(3);
    expect(r.channels).toEqual(['whatsapp', 'slack']);
    expect(analyzeFlow({ status: 'draft', steps: [] }).empty).toBe(true);
    expect(analyzeFlow({ status: 'draft', steps: [note] }).sendsMessages).toBe(false);
  });

  it('marca riesgo de repetición solo en disparadores programados sin guarda', () => {
    expect(analyzeFlow({ status: 'active', trigger: { type: 'contact.inactive' }, steps: [send()] }).repeatRisk).toBe(true);
    expect(analyzeFlow({ status: 'active', trigger: { type: 'contact.inactive' }, steps: [tagGuard, send()] }).repeatRisk).toBe(false);
    expect(analyzeFlow({ status: 'active', trigger: { type: 'contact.created' }, steps: [send()] }).repeatRisk).toBe(false);
  });
});

describe('needsActivationConfirm', () => {
  it('pide confirmar al activar flujos que envían, no al pausar', () => {
    expect(needsActivationConfirm({ status: 'draft', steps: [send()] })).toBe(true);
    expect(needsActivationConfirm({ status: 'paused', steps: [send()] })).toBe(true);
    expect(needsActivationConfirm({ status: 'active', steps: [send()] })).toBe(false);
    expect(needsActivationConfirm({ status: 'draft', steps: [note] })).toBe(false);
  });
});

describe('summarizeRisks', () => {
  const ok = { automationsEnabled: true, webhookConfigured: true, hasNotifyEmail: true };

  it('sin flujos activos no hay riesgos', () => {
    expect(summarizeRisks([{ status: 'draft', steps: [send()] }], ok)).toEqual([]);
  });

  it('ordena por gravedad y avisa de webhook ausente', () => {
    const flows = [
      { status: 'active', trigger: { type: 'contact.created' }, steps: [send()], lastRunStatus: 'error' },
      { status: 'active', trigger: { type: 'contact.created' }, steps: [] },
    ];
    const items = summarizeRisks(flows, { ...ok, webhookConfigured: false });
    expect(items[0].id).toBe('webhook-missing');
    expect(items[0].level).toBe('high');
    expect(items.map((i) => i.id)).toEqual(expect.arrayContaining(['empty', 'failing']));
  });

  it('avisa si el motor está pausado y si no hay correo', () => {
    const flows = [{ status: 'active', trigger: { type: 'contact.created' }, steps: [send()] }];
    expect(summarizeRisks(flows, { ...ok, automationsEnabled: false }).map((i) => i.id)).toContain('paused');
    expect(summarizeRisks(flows, { ...ok, hasNotifyEmail: false }).map((i) => i.id)).toContain('no-email');
  });

  it('usa singular y plural correctos', () => {
    const one = summarizeRisks([{ status: 'active', steps: [] }], ok)[0].text;
    expect(one).toContain('1 flujo activo no tiene');
  });
});

describe('channelLabel', () => {
  it('traduce canales conocidos y deja los demás', () => {
    expect(channelLabel('whatsapp')).toBe('WhatsApp');
    expect(channelLabel('sms')).toBe('sms');
  });
});
