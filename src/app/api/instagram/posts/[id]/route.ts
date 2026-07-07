import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const post = await prisma.socialPost.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
  });
  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.socialPost.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
  if (existing.status === 'published') {
    return NextResponse.json({ error: 'No se puede editar un post ya publicado' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.caption !== undefined) data.caption = String(body.caption);
  if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl ? String(body.coverUrl) : null;
  if (body.keyword !== undefined) data.keyword = body.keyword ? String(body.keyword) : null;
  if (body.pillar !== undefined) data.pillar = body.pillar ? String(body.pillar) : null;
  if (body.hook !== undefined) data.hook = body.hook ? String(body.hook) : null;
  if (Array.isArray(body.mediaUrls)) {
    const urls = (body.mediaUrls as unknown[]).map(String).map((s) => s.trim()).filter(Boolean);
    if (urls.length === 0) return NextResponse.json({ error: 'mediaUrls no puede quedar vacío' }, { status: 400 });
    data.mediaUrls = urls;
  }
  if (body.scheduledAt !== undefined) {
    if (body.scheduledAt === null || body.scheduledAt === '') {
      data.scheduledAt = null;
      data.status = 'draft';
    } else {
      const d = new Date(String(body.scheduledAt));
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'scheduledAt inválido' }, { status: 400 });
      }
      data.scheduledAt = d;
      data.status = 'scheduled';
      data.errorMessage = null;
      data.attemptCount = 0; // reprogramar resetea los reintentos
    }
  }

  const post = await prisma.socialPost.update({ where: { id }, data });
  return NextResponse.json({ post });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.socialPost.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });

  await prisma.socialPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
