/** Implementación de `VoiceStore` sobre Prisma (modelos existentes, sin migración). */
import { prisma } from '../db';
import type { StoredMessage, VoiceStore } from './persist';

export const prismaVoiceStore: VoiceStore = {
  async conversationWorkspace(conversationId) {
    const row = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { contact: { select: { workspaceId: true } } },
    });
    return row?.contact.workspaceId ?? null;
  },

  async findOrCreateContact(workspaceId, phone, name) {
    const existing = await prisma.contact.findFirst({
      where: phone ? { workspaceId, phone } : { workspaceId, source: 'voice', phone: null, name },
      select: { id: true },
    });
    if (existing) return existing;
    return prisma.contact.create({
      data: { workspaceId, name, phone, source: 'voice', tags: ['llamada'] },
      select: { id: true },
    });
  },

  async upsertConversation(c) {
    await prisma.conversation.upsert({
      where: { id: c.id },
      create: { id: c.id, contactId: c.contactId, agentId: c.agentId, channel: 'voice', status: c.status, lastMessageAt: c.lastMessageAt },
      update: { status: c.status, lastMessageAt: c.lastMessageAt },
    });
  },

  async createMessagesIfMissing(messages: StoredMessage[]) {
    if (messages.length === 0) return;
    await prisma.message.createMany({ data: messages, skipDuplicates: true });
  },

  async upsertMessage(m: StoredMessage) {
    await prisma.message.upsert({
      where: { id: m.id },
      create: m,
      update: { body: m.body, attachmentUrl: m.attachmentUrl },
    });
  },
};
