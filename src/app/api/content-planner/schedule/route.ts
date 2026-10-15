import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requirePermission } from '@/lib/roles';
import { logAudit } from '@/lib/audit';
import { parseStoredConfig, DEFAULT_PUBLISH_TIME, DEFAULT_TIMEZONE } from '@/lib/content-planner-config';
import { getPublishMode, sanitizeBatch } from '@/lib/scheduled-posts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_SELECT = {
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
  igMediaId: true,
  permalink: true,
  simulated: true,
  publishedAt: true,
} as const;

/**
 * GET /api/content-planner/schedule?campaignRef=…
 * Lista las publicaciones programadas del workspace activo (nunca de otro).
 */
export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, 'canManageContent');
  if (!isRoleContext(ctx)) return ctx;

  const campaignRef = req.nextUrl.searchParams.get('campaignRef');
  const posts = await prisma.scheduledPost.findMany({
    where: { workspaceId: ctx.workspace.id, ...(campaignRef ? { campaignRef } : {}) },
    orderBy: { scheduledAt: 'asc' },
    take: 200,
    select: PUBLIC_SELECT,
  });
  return NextResponse.json({ mode: getPublishMode(), posts });
}

/**
 * POST /api/content-planner/schedule
 * Body: { campaignRef, time?, timezone?, posts: [{ day, date: 'YYYY-MM-DD', caption, mediaUrls?, mediaType? }] }
 *
 * Programa un lote. Idempotente por (workspace, campaignRef, day): re-programar un día
 * lo actualiza, salvo que ya esté publicado o publicándose (esos se omiten).
 */
export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, 'canManageContent');
  if (!isRoleContext(ctx)) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const row = await prisma.settings.findUnique({
    where: { workspaceId: ctx.workspace.id },
    select: { contentPlannerConfig: true },
  });
  const cfg = parseStoredConfig(row?.contentPlannerConfig ?? null);
  const mode = getPublishMode();

  const batch = sanitizeBatch(body, {
    now: new Date(),
    requireMedia: mode === 'live',
    defaultTime: cfg.publishTime || DEFAULT_PUBLISH_TIME,
    defaultTimezone: cfg.timezone || DEFAULT_TIMEZONE,
  });
  if (!batch.ok) return NextResponse.json({ error: batch.error }, { status: 400 });

  const workspaceId = ctx.workspace.id;
  const skipped = [...batch.skipped];
  let created = 0;
  let updated = 0;

  for (const p of batch.posts) {
    const key = { workspaceId, campaignRef: batch.campaignRef, dayNumber: p.dayNumber };
    const existing = await prisma.scheduledPost.findUnique({
      where: { workspaceId_campaignRef_dayNumber: key },
      select: { id: true, status: true },
    });
    if (existing && (existing.status === 'published' || existing.status === 'publishing')) {
      skipped.push({ day: p.dayNumber, reason: existing.status === 'published' ? 'Ya publicado' : 'Publicándose ahora' });
      continue;
    }
    const data = {
      caption: p.caption,
      mediaUrls: p.mediaUrls,
      mediaType: p.mediaType,
      scheduledAt: p.scheduledAt,
      timezone: batch.timezone,
      status: 'scheduled',
      attempts: 0,
      lastError: null,
      igContainerId: null,
    };
    if (existing) {
      await prisma.scheduledPost.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.scheduledPost.create({
        data: { ...key, ...data, createdByUserId: ctx.auth.userId },
      });
      created++;
    }
  }

  await logAudit({
    workspaceId,
    userId: ctx.auth.userId,
    action: 'content.schedule.batch',
    entityType: 'campaign',
    entityId: batch.campaignRef,
    meta: { created, updated, skipped: skipped.length, mode, time: batch.time, timezone: batch.timezone },
  });

  return NextResponse.json({ ok: true, mode, created, updated, skipped });
}
