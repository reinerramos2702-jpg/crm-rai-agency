import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET    /api/knowledge-bases/[id] → detalle de la base + items + agentes vinculados
 * PATCH  /api/knowledge-bases/[id] → renombra / actualiza descripción
 * DELETE /api/knowledge-bases/[id] → elimina la base (cascade items + triggers)
 */

async function getKB(id: string, workspaceId: string) {
  return prisma.knowledgeBase.findFirst({
    where: { id, workspaceId },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      triggers: { include: { agent: { select: { id: true, name: true, kind: true, status: true } } } },
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const kb = await getKB(id, ctx.workspace.id);
  if (!kb) return NextResponse.json({ error: 'Base de conocimiento no encontrada' }, { status: 404 });

  return NextResponse.json({ knowledgeBase: kb });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const existing = await prisma.knowledgeBase.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Base de conocimiento no encontrada' }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === 'string') data.description = body.description.trim() || null;

  const kb = await prisma.knowledgeBase.update({ where: { id }, data });
  return NextResponse.json({ knowledgeBase: kb });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const existing = await prisma.knowledgeBase.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Base de conocimiento no encontrada' }, { status: 404 });

  await prisma.aIAgentKnowledgeBase.deleteMany({ where: { knowledgeBaseId: id } });
  await prisma.knowledgeBaseItem.deleteMany({ where: { knowledgeBaseId: id } });
  await prisma.knowledgeBase.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
