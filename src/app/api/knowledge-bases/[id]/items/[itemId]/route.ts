import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * PATCH  /api/knowledge-bases/[id]/items/[itemId] → edita un elemento (FAQ, texto, tabla, archivo, URL)
 * DELETE /api/knowledge-bases/[id]/items/[itemId] → elimina un elemento
 */

async function ownedItem(kbId: string, itemId: string, workspaceId: string) {
  const kb = await prisma.knowledgeBase.findFirst({ where: { id: kbId, workspaceId } });
  if (!kb) return null;
  return prisma.knowledgeBaseItem.findFirst({ where: { id: itemId, knowledgeBaseId: kbId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id, itemId } = await params;
  const existing = await ownedItem(id, itemId, ctx.workspace.id);
  if (!existing) return NextResponse.json({ error: 'Elemento no encontrado' }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.question === 'string') data.question = body.question.trim();
  if (typeof body.answer === 'string') data.answer = body.answer;
  if (typeof body.title === 'string') data.title = body.title.trim();
  if (typeof body.content === 'string') data.content = body.content;
  if (body.data !== undefined) data.data = body.data;

  const item = await prisma.knowledgeBaseItem.update({ where: { id: itemId }, data });
  await prisma.knowledgeBase.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ item });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id, itemId } = await params;
  const existing = await ownedItem(id, itemId, ctx.workspace.id);
  if (!existing) return NextResponse.json({ error: 'Elemento no encontrado' }, { status: 404 });

  await prisma.knowledgeBaseItem.delete({ where: { id: itemId } });
  await prisma.knowledgeBase.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
