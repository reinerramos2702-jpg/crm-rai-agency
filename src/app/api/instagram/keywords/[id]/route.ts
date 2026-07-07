import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.keywordRule.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: 'Regla no encontrada' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.keyword !== undefined) {
    const k = String(body.keyword).trim();
    if (!k) return NextResponse.json({ error: 'keyword no puede quedar vacía' }, { status: 400 });
    data.keyword = k;
  }
  if (body.matchType !== undefined) data.matchType = body.matchType === 'exact' ? 'exact' : 'contains';
  if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
  if (body.replyToComment !== undefined) data.replyToComment = Boolean(body.replyToComment);
  if (body.dmEnabled !== undefined) data.dmEnabled = Boolean(body.dmEnabled);
  if (body.dmMessage !== undefined) data.dmMessage = String(body.dmMessage);
  if (body.dmLink !== undefined) data.dmLink = body.dmLink ? String(body.dmLink) : null;
  if (body.mediaScope !== undefined) data.mediaScope = body.mediaScope === 'specific' ? 'specific' : 'all';
  if (Array.isArray(body.commentReplies)) {
    data.commentReplies = (body.commentReplies as unknown[]).map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(body.mediaIds)) {
    data.mediaIds = (body.mediaIds as unknown[]).map(String).filter(Boolean);
  }

  const rule = await prisma.keywordRule.update({ where: { id }, data });
  return NextResponse.json({ rule });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.keywordRule.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: 'Regla no encontrada' }, { status: 404 });

  await prisma.keywordRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
