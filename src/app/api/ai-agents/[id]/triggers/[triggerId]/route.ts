import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * PATCH  /api/ai-agents/[id]/triggers/[triggerId] → edita la condición de activación
 * DELETE /api/ai-agents/[id]/triggers/[triggerId] → desvincula la base de conocimiento del agente
 */

async function ownedTrigger(agentId: string, triggerId: string, workspaceId: string) {
  const agent = await prisma.aIAgent.findFirst({ where: { id: agentId, workspaceId } });
  if (!agent) return null;
  return prisma.aIAgentKnowledgeBase.findFirst({ where: { id: triggerId, agentId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; triggerId: string }> }
) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id, triggerId } = await params;
  const existing = await ownedTrigger(id, triggerId, ctx.workspace.id);
  if (!existing) return NextResponse.json({ error: 'Vínculo no encontrado' }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.triggerCondition === 'string') data.triggerCondition = body.triggerCondition.trim() || null;

  const trigger = await prisma.aIAgentKnowledgeBase.update({
    where: { id: triggerId },
    data,
    include: { knowledgeBase: { include: { _count: { select: { items: true } } } } },
  });

  return NextResponse.json({ trigger });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; triggerId: string }> }
) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id, triggerId } = await params;
  const existing = await ownedTrigger(id, triggerId, ctx.workspace.id);
  if (!existing) return NextResponse.json({ error: 'Vínculo no encontrado' }, { status: 404 });

  await prisma.aIAgentKnowledgeBase.delete({ where: { id: triggerId } });

  return NextResponse.json({ ok: true });
}
