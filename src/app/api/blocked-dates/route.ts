import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { listBlackouts, logPostEvent } from '@/lib/content-calendar/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/blocked-dates → #13 días bloqueados del workspace
 * POST /api/blocked-dates → marca un día como bloqueado (día sin publicación)
 *
 * Mismo criterio de roles que el resto del módulo (ver nota en
 * `content-posts/route.ts`): lectura para cualquier rol del workspace,
 * escritura reservada a admin/gerente/agente.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const blackouts = await listBlackouts(ctx.workspace.id);
  return NextResponse.json({ blackouts });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (typeof body.day !== 'string' || !DAY.test(body.day)) {
    return NextResponse.json({ error: '"day" debe tener formato YYYY-MM-DD.' }, { status: 400 });
  }
  const reason =
    body.reason === undefined || body.reason === null || body.reason === ''
      ? null
      : String(body.reason).slice(0, 200);

  const blackout = await prisma.contentBlackoutDate.upsert({
    where: { workspaceId_day: { workspaceId: ctx.workspace.id, day: body.day } },
    create: { workspaceId: ctx.workspace.id, day: body.day, reason, createdById: ctx.auth.userId },
    update: { reason },
  });

  await logPostEvent({
    workspaceId: ctx.workspace.id,
    actorUserId: ctx.auth.userId,
    action: 'updated',
    detail: `Día ${body.day} marcado como bloqueado${reason ? ` (${reason})` : ''}`,
  });

  return NextResponse.json(
    { blackout: { id: blackout.id, day: blackout.day, reason: blackout.reason } },
    { status: 201 }
  );
}
