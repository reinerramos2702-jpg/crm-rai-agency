import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import {
  getSettings,
  checkDayCapacity,
  postToDTO,
  logPostEvent,
  POST_INCLUDE,
} from '@/lib/content-calendar/service';
import { dayKey } from '@/lib/content-calendar/timezone';
import { NETWORKS, type Network } from '@/lib/content-calendar/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH  /api/content-posts/:id → edita caption/networks/scheduledFor (drag&drop
 *        de reprogramación pega aquí enviando solo `{ scheduledFor }`)
 * DELETE /api/content-posts/:id
 *
 * Mismo criterio de roles que `content-posts/route.ts` (ver nota ahí).
 */

const VALID_NETWORKS = new Set(NETWORKS.map((n) => n.id));

async function loadOwnedPost(workspaceId: string, id: string) {
  return prisma.contentPost.findFirst({ where: { id, workspaceId }, include: POST_INCLUDE });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const existing = await loadOwnedPost(ctx.workspace.id, id);
  if (!existing) {
    return NextResponse.json({ error: 'Publicación no encontrada.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const settings = await getSettings(ctx.workspace.id);
  const data: Record<string, unknown> = {};

  if (body.caption !== undefined) {
    data.caption = body.caption === null ? null : String(body.caption);
  }

  if (body.networks !== undefined) {
    const networksInput = Array.isArray(body.networks) ? body.networks : [];
    if (
      networksInput.length === 0 ||
      !networksInput.every((n) => typeof n === 'string' && VALID_NETWORKS.has(n as Network))
    ) {
      return NextResponse.json(
        { error: `"networks" debe ser un arreglo no vacío con valores válidos: ${Array.from(VALID_NETWORKS).join(', ')}.` },
        { status: 400 }
      );
    }
    data.networks = networksInput;
  }

  let scheduledForChanged = false;
  if (body.scheduledFor !== undefined) {
    if (body.scheduledFor === null) {
      data.scheduledFor = null;
      data.status = 'draft';
      scheduledForChanged = true;
    } else if (typeof body.scheduledFor === 'string') {
      const parsed = new Date(body.scheduledFor);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: '"scheduledFor" no es una fecha válida.' }, { status: 400 });
      }

      const day = dayKey(parsed, settings.timezone);
      const capacity = await checkDayCapacity({
        workspaceId: ctx.workspace.id,
        day,
        timezone: settings.timezone,
        maxPostsPerDay: settings.maxPostsPerDay,
        ignorePostId: existing.id,
      });
      if (!capacity.ok) {
        return NextResponse.json({ error: capacity.message, reason: capacity.reason }, { status: 422 });
      }

      data.scheduledFor = parsed;
      data.status = settings.requireApproval ? 'pending_approval' : 'scheduled';
      scheduledForChanged = true;
    } else {
      return NextResponse.json({ error: '"scheduledFor" debe ser una fecha ISO o null.' }, { status: 400 });
    }
  }

  const updated = await prisma.contentPost.update({
    where: { id: existing.id },
    data,
    include: POST_INCLUDE,
  });

  await logPostEvent({
    workspaceId: ctx.workspace.id,
    postId: updated.id,
    actorUserId: ctx.auth.userId,
    action: scheduledForChanged ? 'moved' : 'updated',
    detail: `Campos actualizados: ${Object.keys(data).join(', ') || 'ninguno'}`,
  });

  return NextResponse.json({ post: postToDTO(updated, settings.timezone) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const existing = await loadOwnedPost(ctx.workspace.id, id);
  if (!existing) {
    return NextResponse.json({ error: 'Publicación no encontrada.' }, { status: 404 });
  }

  await prisma.contentPost.delete({ where: { id: existing.id } });

  await logPostEvent({
    workspaceId: ctx.workspace.id,
    postId: null,
    actorUserId: ctx.auth.userId,
    action: 'deleted',
    detail: `Publicación ${existing.id} eliminada`,
  });

  return NextResponse.json({ ok: true });
}
