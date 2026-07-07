import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

const TYPES = ['image', 'carousel', 'reel', 'story'];
const STATUSES = ['draft', 'scheduled', 'publishing', 'published', 'failed'];

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || '';
  const type = url.searchParams.get('type') || '';

  const where: Record<string, unknown> = { workspaceId: ctx.workspace.id };
  if (status && STATUSES.includes(status)) where.status = status;
  if (type && TYPES.includes(type)) where.type = type;

  const posts = await prisma.socialPost.findMany({
    where,
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });

  const byStatus: Record<string, number> = {};
  const counts = await prisma.socialPost.groupBy({
    by: ['status'],
    where: { workspaceId: ctx.workspace.id },
    _count: { _all: true },
  });
  counts.forEach((c) => { byStatus[c.status] = c._count._all; });

  return NextResponse.json(
    { posts, byStatus },
    { headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=30' } }
  );
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

  const type = String(body.type || 'image');
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: `type debe ser uno de: ${TYPES.join(', ')}` }, { status: 400 });
  }

  const mediaUrls = Array.isArray(body.mediaUrls)
    ? (body.mediaUrls as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
    : [];
  if (mediaUrls.length === 0) {
    return NextResponse.json({ error: 'mediaUrls es obligatorio (URLs públicas)' }, { status: 400 });
  }
  if (type === 'carousel' && (mediaUrls.length < 2 || mediaUrls.length > 10)) {
    return NextResponse.json({ error: 'Un carrusel necesita entre 2 y 10 medias' }, { status: 400 });
  }

  const scheduledAtRaw = body.scheduledAt ? String(body.scheduledAt) : '';
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  if (scheduledAtRaw && Number.isNaN(scheduledAt?.getTime())) {
    return NextResponse.json({ error: 'scheduledAt inválido (usar ISO 8601)' }, { status: 400 });
  }

  const status = scheduledAt ? 'scheduled' : 'draft';

  const post = await prisma.socialPost.create({
    data: {
      workspaceId: ctx.workspace.id,
      type,
      status,
      caption: String(body.caption || ''),
      mediaUrls,
      coverUrl: body.coverUrl ? String(body.coverUrl) : null,
      scheduledAt,
      keyword: body.keyword ? String(body.keyword) : null,
      pillar: body.pillar ? String(body.pillar) : null,
      hook: body.hook ? String(body.hook) : null,
      source: 'manual',
      createdById: ctx.auth.userId,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
