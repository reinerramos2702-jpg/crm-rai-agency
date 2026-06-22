import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/ai-agents/[id]/triggers → lista las bases de conocimiento vinculadas al agente
 *      (sección "Entrenamiento del bot" → Knowledge Base Triggers)
 * POST /api/ai-agents/[id]/triggers
 *   body: { knowledgeBaseId, triggerCondition? } → vincula una base de conocimiento al agente
 */

async function ownedAgent(id: string, workspaceId: string) {
  return prisma.aIAgent.findFirst({ where: { id, workspaceId } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const agent = await ownedAgent(id, ctx.workspace.id);
  if (!agent) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });

  const triggers = await prisma.aIAgentKnowledgeBase.findMany({
    where: { agentId: id },
    orderBy: { createdAt: 'asc' },
    include: { knowledgeBase: { include: { _count: { select: { items: true } } } } },
  });

  return NextResponse.json({ triggers });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const agent = await ownedAgent(id, ctx.workspace.id);
  if (!agent) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });

  const body = await req.json();
  const knowledgeBaseId = body.knowledgeBaseId;
  if (typeof knowledgeBaseId !== 'string' || !knowledgeBaseId) {
    return NextResponse.json({ error: 'knowledgeBaseId es requerido' }, { status: 400 });
  }

  const kb = await prisma.knowledgeBase.findFirst({ where: { id: knowledgeBaseId, workspaceId: ctx.workspace.id } });
  if (!kb) return NextResponse.json({ error: 'Base de conocimiento no encontrada' }, { status: 404 });

  const existing = await prisma.aIAgentKnowledgeBase.findUnique({
    where: { agentId_knowledgeBaseId: { agentId: id, knowledgeBaseId } },
  });
  if (existing) return NextResponse.json({ error: 'Esta base ya está vinculada al agente' }, { status: 409 });

  const trigger = await prisma.aIAgentKnowledgeBase.create({
    data: {
      agentId: id,
      knowledgeBaseId,
      triggerCondition: typeof body.triggerCondition === 'string' ? body.triggerCondition.trim() || null : null,
    },
    include: { knowledgeBase: { include: { _count: { select: { items: true } } } } },
  });

  return NextResponse.json({ trigger }, { status: 201 });
}
