import { describe, expect, it } from 'vitest';
import { conversationIdFor, parseMetaMessage, metaMessageIdFor } from '../call-meta';
import { persistVoiceEvent, type StoredMessage, type VoiceStore } from '../persist';
import { normalizeRetellCall } from '../retell';

class FakeStore implements VoiceStore {
  conversations = new Map<string, { workspaceId: string; contactId: string; status: string; agentId: string }>();
  contacts: Array<{ id: string; workspaceId: string; phone: string | null; name: string }> = [];
  messages = new Map<string, StoredMessage>();

  async conversationWorkspace(id: string) {
    return this.conversations.get(id)?.workspaceId ?? null;
  }
  async findOrCreateContact(workspaceId: string, phone: string | null, name: string) {
    const hit = this.contacts.find((c) => c.workspaceId === workspaceId && (phone ? c.phone === phone : c.name === name && c.phone === null));
    if (hit) return { id: hit.id };
    const c = { id: `c${this.contacts.length + 1}`, workspaceId, phone, name };
    this.contacts.push(c);
    return { id: c.id };
  }
  async upsertConversation(c: { id: string; contactId: string; agentId: string; status: 'open' | 'closed' }) {
    const ws = this.contacts.find((x) => x.id === c.contactId)!.workspaceId;
    this.conversations.set(c.id, { workspaceId: ws, contactId: c.contactId, status: c.status, agentId: c.agentId });
  }
  async createMessagesIfMissing(ms: StoredMessage[]) {
    for (const m of ms) if (!this.messages.has(m.id)) this.messages.set(m.id, m);
  }
  async upsertMessage(m: StoredMessage) {
    this.messages.set(m.id, m);
  }
}

const rawCall = (over: Record<string, unknown> = {}) => ({
  call_id: 'call_abc',
  agent_id: 'ag_retell',
  call_type: 'phone_call',
  call_status: 'ended',
  direction: 'inbound',
  from_number: '+58 412-123-4567',
  to_number: '+12025550100',
  start_timestamp: 1_800_000_000_000,
  end_timestamp: 1_800_000_125_000,
  duration_ms: 125_000,
  disconnection_reason: 'agent_hangup',
  transcript_object: [
    { role: 'agent', content: 'Hola, gracias por llamar.' },
    { role: 'user', content: '¿Cuánto cuesta la habitación?' },
    { role: 'agent', content: 'Cuesta 80 dólares.' },
  ],
  call_cost: { combined_cost: 14.5, total_duration_seconds: 125 },
  ...over,
});
const target = { workspaceId: 'ws-A', agentId: 'agt_1' };

describe('persistVoiceEvent', () => {
  it('call_started abre la conversación y crea el contacto con teléfono E.164', async () => {
    const store = new FakeStore();
    const r = await persistVoiceEvent(store, target, 'call_started', normalizeRetellCall(rawCall({ transcript_object: undefined }))!);
    expect(r.ok).toBe(true);
    expect(store.conversations.get(conversationIdFor('call_abc'))?.status).toBe('open');
    expect(store.contacts[0]).toMatchObject({ workspaceId: 'ws-A', phone: '+584121234567' });
  });

  it('call_ended cierra, guarda la transcripción en orden y el costo real en dólares', async () => {
    const store = new FakeStore();
    await persistVoiceEvent(store, target, 'call_ended', normalizeRetellCall(rawCall())!);
    expect(store.conversations.get('vc_call_abc')?.status).toBe('closed');
    const turns = [...store.messages.values()].filter((m) => !m.id.endsWith('_meta')).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    expect(turns.map((t) => t.body)).toEqual(['Hola, gracias por llamar.', '¿Cuánto cuesta la habitación?', 'Cuesta 80 dólares.']);
    expect(turns.map((t) => t.sender)).toEqual(['ai', 'contact', 'ai']);
    const meta = parseMetaMessage(store.messages.get(metaMessageIdFor('call_abc'))!.body)!;
    expect(meta.durationSec).toBe(125);
    expect(meta.costUsd).toBe(0.145);
  });

  it('es idempotente: repetir el mismo evento no duplica mensajes, contactos ni conversaciones', async () => {
    const store = new FakeStore();
    const call = normalizeRetellCall(rawCall())!;
    await persistVoiceEvent(store, target, 'call_ended', call);
    const snapshot = JSON.stringify([...store.messages.entries()]);
    await persistVoiceEvent(store, target, 'call_ended', call);
    await persistVoiceEvent(store, target, 'call_ended', call);
    expect(store.messages.size).toBe(4); // 3 turnos + resumen
    expect(store.contacts).toHaveLength(1);
    expect(store.conversations.size).toBe(1);
    expect(JSON.stringify([...store.messages.entries()])).toBe(snapshot);
  });

  it('call_analyzed reescribe el resumen sin tocar la transcripción', async () => {
    const store = new FakeStore();
    await persistVoiceEvent(store, target, 'call_ended', normalizeRetellCall(rawCall())!);
    const analyzed = normalizeRetellCall(rawCall({ call_analysis: { call_summary: 'Consultó tarifas.', user_sentiment: 'Positive', call_successful: true } }))!;
    await persistVoiceEvent(store, target, 'call_analyzed', analyzed);
    expect(store.messages.size).toBe(4);
    const meta = parseMetaMessage(store.messages.get('vc_call_abc_meta')!.body)!;
    expect(meta.summary).toBe('Consultó tarifas.');
    expect(meta.outcome).toBe('resolved');
  });

  it('no sobrescribe una llamada que pertenece a otro workspace', async () => {
    const store = new FakeStore();
    await persistVoiceEvent(store, target, 'call_ended', normalizeRetellCall(rawCall())!);
    const r = await persistVoiceEvent(store, { workspaceId: 'ws-B', agentId: 'agt_9' }, 'call_ended', normalizeRetellCall(rawCall())!);
    expect(r).toEqual({ ok: false, reason: 'tenant_mismatch' });
    expect(store.conversations.get('vc_call_abc')?.workspaceId).toBe('ws-A');
  });

  it('las llamadas web usan un contacto de prueba y no guardan teléfono', async () => {
    const store = new FakeStore();
    await persistVoiceEvent(store, target, 'call_ended', normalizeRetellCall(rawCall({ call_type: 'web_call', from_number: undefined }))!);
    expect(store.contacts[0]).toMatchObject({ phone: null, name: 'Prueba de voz (navegador)' });
  });
});
