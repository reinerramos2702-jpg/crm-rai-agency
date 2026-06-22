import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET    /api/ai-agents/[id]   → detalle de un agente + triggers de entrenamiento
 * PATCH  /api/ai-agents/[id]   → actualiza configuración / objetivos / canales / estado
 * DELETE /api/ai-agents/[id]   → elimina el agente (las conversaciones quedan sin agente)
 */

async function getAgent(id: string, workspaceId: string) {
  return prisma.aIAgent.findFirst({
    where: { id, workspaceId },
    include: {
      triggers: {
        orderBy: { createdAt: 'asc' },
        include: { knowledgeBase: { select: { id: true, name: true, description: true } } },
      },
      _count: { select: { conversations: true } },
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const agent = await getAgent(id, ctx.workspace.id);
  if (!agent) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });

  return NextResponse.json({ agent });
}

const ALLOWED_STATUS = ['active', 'suggested', 'disabled'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const existing = await prisma.aIAgent.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.status === 'string' && ALLOWED_STATUS.includes(body.status)) data.status = body.status;
  if (Array.isArray(body.channels)) data.channels = body.channels.filter((c: unknown) => typeof c === 'string');
  if (typeof body.llmProvider === 'string') data.llmProvider = body.llmProvider;
  if (typeof body.llmModel === 'string') data.llmModel = body.llmModel;
  if (typeof body.personality === 'string') data.personality = body.personality;
  if (typeof body.objective === 'string') data.objective = body.objective;
  if (typeof body.additionalInfo === 'string') data.additionalInfo = body.additionalInfo;
  if (typeof body.welcomeMessage === 'string') data.welcomeMessage = body.welcomeMessage;
  if (typeof body.fallbackMessage === 'string') data.fallbackMessage = body.fallbackMessage;
  if (typeof body.avgSecondsPerMessage === 'number' && body.avgSecondsPerMessage > 0) {
    data.avgSecondsPerMessage = Math.round(body.avgSecondsPerMessage);
  }

  // Solo un agente puede ser "principal" a la vez por workspace.
  if (typeof body.isPrimary === 'boolean') {
    if (body.isPrimary) {
      await prisma.aIAgent.updateMany({
        where: { workspaceId: ctx.workspace.id, id: { not: id }, isPrimary: true },
        data: { isPrimary: false },
      });
      data.isPrimary = true;
      // El agente principal debe estar en piloto automático para responder mensajes.
      if (!body.status) data.status = 'active';
    } else {
      data.isPrimary = false;
    }
  }

  const agent = await prisma.aIAgent.update({ where: { id }, data });
  return NextResponse.json({ agent });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const existing = await prisma.aIAgent.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });

  await prisma.aIAgentKnowledgeBase.deleteMany({ where: { agentId: id } });
  await prisma.aIAgent.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
