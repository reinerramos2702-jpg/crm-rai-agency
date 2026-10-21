import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requirePermission } from '@/lib/roles';
import { logAudit } from '@/lib/audit';
import { publishPostNow } from '@/lib/publish-runner';
import { productionDeps } from '@/lib/schedule-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/content-planner/schedule/:id   Body: { action: 'cancel' | 'retry' | 'publish-now' }
 * Siempre scopeado al workspace activo: un id de otro workspace responde 404.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requirePermission(req, 'canManageContent');
  if (!isRoleContext(ctx)) return ctx;

  let action: unknown;
  try {
    action = ((await req.json()) as { action?: unknown }).action;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (action !== 'cancel' && action !== 'retry' && action !== 'publish-now') {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }

  const workspaceId = ctx.workspace.id;
  const post = await prisma.scheduledPost.findFirst({
    where: { id: params.id, workspaceId },
    select: { id: true, status: true },
  });
  if (!post) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });

  if (action === 'publish-now') {
    const r = await publishPostNow(productionDeps(), workspaceId, post.id);
    await logAudit({ workspaceId, userId: ctx.auth.userId, action: 'content.schedule.publish_now', entityType: 'scheduled_post', entityId: post.id, meta: { ok: r.ok, status: r.status } });
    return NextResponse.json(r, { status: r.ok ? 200 : r.status === 'conflict' ? 409 : 422 });
  }

  if (action === 'cancel') {
    const res = await prisma.scheduledPost.updateMany({
      where: { id: post.id, workspaceId, status: { in: ['draft', 'scheduled', 'failed'] } },
      data: { status: 'cancelled', lockedAt: null },
    });
    if (res.count !== 1) return NextResponse.json({ error: `No se puede cancelar en estado ${post.status}` }, { status: 409 });
  } else {
    const res = await prisma.scheduledPost.updateMany({
      where: { id: post.id, workspaceId, status: { in: ['failed', 'cancelled'] } },
      data: { status: 'scheduled', attempts: 0, lastError: null, scheduledAt: new Date() },
    });
    if (res.count !== 1) return NextResponse.json({ error: `No se puede reintentar en estado ${post.status}` }, { status: 409 });
  }

  await logAudit({ workspaceId, userId: ctx.auth.userId, action: `content.schedule.${action}`, entityType: 'scheduled_post', entityId: post.id });
  return NextResponse.json({ ok: true });
}
