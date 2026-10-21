import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requirePermission } from '@/lib/roles';
import { parseStoredConfig, DEFAULT_TIMEZONE } from '@/lib/content-planner-config';
import { getPublishMode, isMissingTableError } from '@/lib/scheduled-posts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_RANGE_MS = 70 * 86400_000;

/**
 * GET /api/marketing/posts?from=ISO&to=ISO — publicaciones programadas del rango (para el calendario).
 * Mismo permiso y mismo modelo que /api/content-planner/schedule; solo cambia el filtro por fechas.
 */
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, 'canManageContent');
  if (!isRoleContext(ctx)) return ctx;

  const from = new Date(req.nextUrl.searchParams.get('from') ?? '');
  const to = new Date(req.nextUrl.searchParams.get('to') ?? '');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 });
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    return NextResponse.json({ error: 'El rango es demasiado grande' }, { status: 400 });
  }

  const workspaceId = ctx.workspace.id;
  try {
    const [posts, settings] = await Promise.all([
      prisma.scheduledPost.findMany({
        where: { workspaceId, scheduledAt: { gte: from, lt: to } },
        orderBy: { scheduledAt: 'asc' },
        take: 300,
        select: {
          id: true,
          campaignRef: true,
          dayNumber: true,
          caption: true,
          mediaUrls: true,
          mediaType: true,
          scheduledAt: true,
          timezone: true,
          status: true,
          attempts: true,
          lastError: true,
          permalink: true,
          simulated: true,
          publishedAt: true,
        },
      }),
      prisma.settings.findUnique({ where: { workspaceId }, select: { contentPlannerConfig: true } }),
    ]);
    const cfg = parseStoredConfig(settings?.contentPlannerConfig ?? null);
    return NextResponse.json({
      mode: getPublishMode(),
      timezone: cfg.timezone || DEFAULT_TIMEZONE,
      igHandle: cfg.igHandle,
      posts,
    });
  } catch (e) {
    if (isMissingTableError(e)) {
      return NextResponse.json({ error: 'schema_pending', message: 'Falta aplicar la tabla ScheduledPost en esta base de datos.' }, { status: 503 });
    }
    throw e;
  }
}
