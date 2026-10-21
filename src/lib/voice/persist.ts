/**
 * Persistencia de eventos de llamada con los modelos EXISTENTES (Contact / Conversation / Message),
 * sin migración. Todo es idempotente: los ids son determinísticos, así que un reintento del
 * webhook no duplica nada. La base de datos queda detrás de `VoiceStore` para poder probarla.
 */
import { normalizePhone } from '../phone';
import {
  conversationIdFor, formatMetaMessage, metaFromRecord, metaMessageIdFor, turnMessageIdFor,
} from './call-meta';
import type { VoiceCallRecord, VoiceEventName } from './types';

export interface StoredMessage {
  id: string;
  conversationId: string;
  direction: 'in' | 'out';
  sender: 'contact' | 'ai';
  body: string;
  attachmentUrl: string | null;
  createdAt: Date;
}

export interface VoiceStore {
  /** Workspace dueño de una conversación ya guardada (guardia de aislamiento por tenant). */
  conversationWorkspace(conversationId: string): Promise<string | null>;
  findOrCreateContact(workspaceId: string, phone: string | null, name: string): Promise<{ id: string }>;
  upsertConversation(c: { id: string; contactId: string; agentId: string; status: 'open' | 'closed'; lastMessageAt: Date }): Promise<void>;
  /** Crea los mensajes que falten; los existentes no se tocan. */
  createMessagesIfMissing(messages: StoredMessage[]): Promise<void>;
  /** Crea o actualiza un mensaje (el resumen se reescribe al llegar el análisis). */
  upsertMessage(message: StoredMessage): Promise<void>;
}

export interface PersistTarget {
  workspaceId: string;
  /** Id del agente del CRM (ya verificado contra la base de datos). */
  agentId: string;
}

export type PersistResult =
  | { ok: true; conversationId: string; messagesWritten: number }
  | { ok: false; reason: 'tenant_mismatch' };

const callerName = (phone: string | null, web: boolean): string =>
  web ? 'Prueba de voz (navegador)' : phone ? `Llamante ${phone}` : 'Llamante anónimo';

export async function persistVoiceEvent(
  store: VoiceStore,
  target: PersistTarget,
  event: VoiceEventName,
  call: VoiceCallRecord,
): Promise<PersistResult> {
  const conversationId = conversationIdFor(call.callId);

  // Una llamada ya guardada para otro workspace nunca se sobrescribe.
  const owner = await store.conversationWorkspace(conversationId);
  if (owner !== null && owner !== target.workspaceId) return { ok: false, reason: 'tenant_mismatch' };

  const web = call.callType === 'web_call';
  const phone = web ? null : normalizePhone(call.fromNumber);
  const contact = await store.findOrCreateContact(target.workspaceId, phone, callerName(phone, web));

  const startedAt = new Date(call.startMs ?? Date.now());
  const ended = event !== 'call_started';
  await store.upsertConversation({
    id: conversationId,
    contactId: contact.id,
    agentId: target.agentId,
    status: ended ? 'closed' : 'open',
    lastMessageAt: new Date(call.endMs ?? call.startMs ?? Date.now()),
  });

  let written = 0;

  // Resumen y metadatos: se reescribe en cada evento (call_analyzed trae el análisis final).
  await store.upsertMessage({
    id: metaMessageIdFor(call.callId),
    conversationId,
    direction: 'out',
    sender: 'ai',
    body: formatMetaMessage(metaFromRecord(call)),
    attachmentUrl: call.recordingUrl,
    createdAt: new Date(startedAt.getTime() - 1),
  });
  written += 1;

  // Transcripción: se escribe una vez (call_ended la trae completa); los reintentos no duplican.
  if (ended && call.transcript.length > 0) {
    const turns: StoredMessage[] = call.transcript.map((t, i) => ({
      id: turnMessageIdFor(call.callId, i),
      conversationId,
      direction: t.role === 'user' ? 'in' : 'out',
      sender: t.role === 'user' ? 'contact' : 'ai',
      body: t.content,
      attachmentUrl: null,
      createdAt: new Date(startedAt.getTime() + i),
    }));
    await store.createMessagesIfMissing(turns);
    written += turns.length;
  }

  return { ok: true, conversationId, messagesWritten: written };
}
