import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * POST /api/ai-agents/[id]/duplicate
 * Clona la configuración de un agente (personalidad, objetivos, canales, LLM,
 * bases de conocimiento asociadas) en un nuevo agente "Sugerido" (no principal).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const original = await prisma.aIAgent.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { triggers: true },
  });
  if (!original) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });

  const copy = await prisma.aIAgent.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: `${original.name} (copia)`,
      status: 'suggested',
      isPrimary: false,
      kind: original.kind,
      channels: original.channels,
      llmProvider: original.llmProvider,
      llmModel: original.llmModel,
      personality: original.personality,
      objective: original.objective,
      additionalInfo: original.additionalInfo,
      welcomeMessage: original.welcomeMessage,
      fallbackMessage: original.fallbackMessage,
      avgSecondsPerMessage: original.avgSecondsPerMessage,
      triggers: original.triggers.length
        ? {
            create: original.triggers.map((t) => ({
              knowledgeBaseId: t.knowledgeBaseId,
              triggerCondition: t.triggerCondition,
            })),
          }
        : undefined,
    },
  });

  return NextResponse.json({ agent: copy }, { status: 201 });
}
