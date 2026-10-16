import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
 *
 * Rendimiento: antes se traían hasta 200 conversaciones con TODOS sus mensajes y se
 * filtraba en memoria. Ahora la base filtra las conversaciones con respuestas de la IA
 * en el rango y solo se leen (en paralelo) las marcas de tiempo de esos mensajes, los
 * conteos agregados y el último mensaje de cada conversación.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const TABLE_ROWS = 50;

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId');
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * DAY_MS);

  const agentWhere = agentId && agentId !== 'all' ? { agentId } : { agentId: { not: null } as unknown as string };

  const [agents, conversations] = await Promise.all([
    prisma.aIAgent.findMany({
      where: { workspaceId: ws.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, kind: true, status: true, isPrimary: true, avgSecondsPerMessage: true },
    }),
    prisma.conversation.findMany({
      where: {
        ...agentWhere,
        contact: { workspaceId: ws.id },
        messages: { some: { sender: 'ai', createdAt: { gte: since } } },
      },
      select: {
        id: true,
        contactId: true,
        channel: true,
        status: true,
        lastMessageAt: true,
        contact: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        agent: { select: { id: true, name: true, kind: true, avgSecondsPerMessage: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
    }),
  ]);

  const ids = conversations.map((c) => c.id);
  const contactIds = Array.from(new Set(conversations.map((c) => c.contactId)));

  const [aiInRange, counts, totalAppointments] = ids.length
    ? await Promise.all([
        prisma.message.findMany({
          where: { conversationId: { in: ids }, sender: 'ai', createdAt: { gte: since } },
          select: { conversationId: true, createdAt: true },
        }),
        prisma.message.groupBy({
          by: ['conversationId', 'sender'],
          where: { conversationId: { in: ids.slice(0, TABLE_ROWS) } },
          _count: { _all: true },
        }),
        prisma.appointment.count({
          where: { workspaceId: ws.id, createdAt: { gte: since }, contactId: { in: contactIds } },
        }),
      ])
    : [[], [], 0];

  const convById = new Map(conversations.map((c) => [c.id, c]));
  const dayBuckets = new Map<string, Set<string>>();
  let totalAiMessages = 0;
  let timeSavedSeconds = 0;

  for (const msg of aiInRange) {
    const conv = convById.get(msg.conversationId);
    if (!conv) continue;
    totalAiMessages += 1;
    timeSavedSeconds += conv.agent?.avgSecondsPerMessage ?? 8;
    const day = msg.createdAt.toISOString().slice(0, 10);
    let set = dayBuckets.get(day);
    if (!set) dayBuckets.set(day, (set = new Set()));
    set.add(conv.contactId);
  }

  // Serie diaria continua para los últimos `days` días (incluye días sin actividad).
  const chart: { date: string; contacts: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    chart.push({ date: key, contacts: dayBuckets.get(key)?.size || 0 });
  }

  const totals = new Map<string, { all: number; ai: number }>();
  for (const row of counts) {
    const t = totals.get(row.conversationId) ?? { all: 0, ai: 0 };
    t.all += row._count._all;
    if (row.sender === 'ai') t.ai += row._count._all;
    totals.set(row.conversationId, t);
  }

  const conversationsTable = conversations.slice(0, TABLE_ROWS).map((c) => {
    const t = totals.get(c.id) ?? { all: 0, ai: 0 };
    const last = c.messages[0];
    return {
      id: c.id,
      contact: c.contact,
      channel: c.channel,
      status: c.status,
      agent: c.agent ? { id: c.agent.id, name: c.agent.name, kind: c.agent.kind } : null,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: last ? last.body.slice(0, 140) : null,
      messageCount: t.all,
      aiMessageCount: t.ai,
    };
  });

  return NextResponse.json({
    range: { since: since.toISOString(), days },
    metrics: {
      totalContacts: contactIds.length,
      totalActions: totalAiMessages,
      totalMessages: totalAiMessages,
      totalAppointments,
      timeSavedMinutes: Math.round((timeSavedSeconds / 60) * 10) / 10,
      avgMessagesPerContact: contactIds.length ? Math.round((totalAiMessages / contactIds.length) * 10) / 10 : 0,
    },
    chart,
    conversations: conversationsTable,
    agents,
  });
}
