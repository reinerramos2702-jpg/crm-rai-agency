/** Consultas de llamadas de voz (Conversation canal `voice`), siempre acotadas al workspace. */
import { prisma } from '../db';
import { parseMetaMessage, type VoiceCallMeta } from './call-meta';
import { readCostAssumptions } from './cost';
import { monthRange, summarizeUsage, type UsageSummary } from './usage';

export const META_SUFFIX = '_meta';

export async function loadMonthUsage(workspaceId: string, capUsd: number, includeNumber: boolean, now: Date = new Date()): Promise<UsageSummary> {
  const range = monthRange(now);
  const rows = await prisma.message.findMany({
    where: {
      id: { startsWith: 'vc_', endsWith: META_SUFFIX },
      createdAt: { gte: new Date(range.startMs), lt: new Date(range.endMs) },
      conversation: { channel: 'voice', contact: { workspaceId } },
    },
    select: { body: true },
    take: 5000,
  });
  const metas = rows.map((r) => parseMetaMessage(r.body)).filter((m): m is VoiceCallMeta => m !== null);
  return summarizeUsage(metas, { capUsd, assumptions: readCostAssumptions(), includeNumber, month: range.label });
}

export interface CallListItem {
  id: string;
  callId: string;
  contact: { name: string; phone: string | null };
  startedAt: string;
  durationSec: number;
  outcome: VoiceCallMeta['outcome'];
  summary: string | null;
  sentiment: string | null;
  costUsd: number | null;
  recordingUrl: string | null;
  webCall: boolean;
  status: VoiceCallMeta['status'];
  transcript: Array<{ role: 'agent' | 'user'; text: string }>;
}

export async function loadCalls(workspaceId: string, limit: number, cursor: string | null): Promise<{ calls: CallListItem[]; nextCursor: string | null }> {
  const rows = await prisma.conversation.findMany({
    where: { channel: 'voice', contact: { workspaceId } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      contact: { select: { name: true, phone: true } },
      messages: { orderBy: { createdAt: 'asc' }, take: 400, select: { id: true, direction: true, body: true, attachmentUrl: true } },
    },
  });
  const page = rows.slice(0, limit);
  const calls: CallListItem[] = page.map((c) => {
    const metaMsg = c.messages.find((m) => m.id.endsWith(META_SUFFIX));
    const meta = metaMsg ? parseMetaMessage(metaMsg.body) : null;
    return {
      id: c.id,
      callId: meta?.callId ?? c.id.replace(/^vc_/, ''),
      contact: { name: c.contact.name, phone: c.contact.phone },
      startedAt: (meta?.startMs ? new Date(meta.startMs) : c.createdAt).toISOString(),
      durationSec: meta?.durationSec ?? 0,
      outcome: meta?.outcome ?? 'unknown',
      summary: meta?.summary ?? null,
      sentiment: meta?.sentiment ?? null,
      costUsd: meta?.costUsd ?? null,
      recordingUrl: metaMsg?.attachmentUrl ?? null,
      webCall: meta?.webCall ?? false,
      status: meta?.status ?? 'ended',
      transcript: c.messages
        .filter((m) => !m.id.endsWith(META_SUFFIX))
        .map((m) => ({ role: m.direction === 'in' ? ('user' as const) : ('agent' as const), text: m.body })),
    };
  });
  return { calls, nextCursor: rows.length > limit ? page[page.length - 1].id : null };
}
