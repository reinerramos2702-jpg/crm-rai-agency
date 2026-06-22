import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET /api/ai-agents/dashboard?agentId=all|<id>&days=30
 *
 * Tablero global del módulo Agentes de IA:
 *  - totalContacts: contactos únicos atendidos por agentes de IA
 *  - totalActions: respuestas (mensajes) generadas por la IA
 *  - totalAppointments: citas reservadas por contactos atendidos por la IA
 *  - timeSavedMinutes: estimación de tiempo ahorrado (mensajes IA * seg/mensaje del agente)
 *  - totalMessages: total de mensajes IA en el rango
 *  - avgMessagesPerContact
 *  - chart: serie diaria de contactos únicos atendidos
 *  - conversations: tabla de conversaciones recientes atendidas por IA
 *  - agents: lista de agentes para el selector de filtro
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId');
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const agents = await prisma.aIAgent.findMany({
    where: { workspaceId: ws.id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, kind: true, status: true, isPrimary: true, avgSecondsPerMessage: true },
  });

  const agentWhere =
    agentId && agentId !== 'all'
      ? { agentId }
      : { agentId: { not: null } as unknown as string };

  const conversations = await prisma.conversation.findMany({
    where: {
      ...agentWhere,
      contact: { workspaceId: ws.id },
    },
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      agent: { select: { id: true, name: true, kind: true, avgSecondsPerMessage: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 200,
  });

  const contactIds = new Set<string>();
  let totalAiMessages = 0;
  let timeSavedSeconds = 0;
  const dayBuckets = new Map<string, Set<string>>();

  for (const conv of conversations) {
    const aiMessages = conv.messages.filter((m) => m.sender === 'ai' && m.createdAt >= since);
    if (aiMessages.length === 0) continue;

    contactIds.add(conv.contactId);
    totalAiMessages += aiMessages.length;
    const perMessage = conv.agent?.avgSecondsPerMessage ?? 8;
    timeSavedSeconds += aiMessages.length * perMessage;

    for (const msg of aiMessages) {
      const day = msg.createdAt.toISOString().slice(0, 10);
      if (!dayBuckets.has(day)) dayBuckets.set(day, new Set());
      dayBuckets.get(day)!.add(conv.contactId);
    }
  }

  // Serie diaria continua para los últimos `days` días (incluye días sin actividad).
  const chart: { date: string; contacts: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    chart.push({ date: key, contacts: dayBuckets.get(key)?.size || 0 });
  }

  const totalAppointments = contactIds.size
    ? await prisma.appointment.count({
        where: {
          workspaceId: ws.id,
          createdAt: { gte: since },
          contactId: { in: Array.from(contactIds) },
        },
      })
    : 0;

  const conversationsTable = conversations
    .filter((c) => c.messages.some((m) => m.sender === 'ai' && m.createdAt >= since))
    .slice(0, 50)
    .map((c) => {
      const last = c.messages[c.messages.length - 1];
      const aiCount = c.messages.filter((m) => m.sender === 'ai').length;
      return {
        id: c.id,
        contact: c.contact,
        channel: c.channel,
        status: c.status,
        agent: c.agent ? { id: c.agent.id, name: c.agent.name, kind: c.agent.kind } : null,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: last ? last.body.slice(0, 140) : null,
        messageCount: c.messages.length,
        aiMessageCount: aiCount,
      };
    });

  return NextResponse.json({
    range: { since: since.toISOString(), days },
    metrics: {
      totalContacts: contactIds.size,
      totalActions: totalAiMessages,
      totalMessages: totalAiMessages,
      totalAppointments,
      timeSavedMinutes: Math.round((timeSavedSeconds / 60) * 10) / 10,
      avgMessagesPerContact: contactIds.size ? Math.round((totalAiMessages / contactIds.size) * 10) / 10 : 0,
    },
    chart,
    conversations: conversationsTable,
    agents,
  });
}
