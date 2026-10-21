import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole, hasPermission, canWrite, MODULE_ACCESS } from '@/lib/roles';
import { isMissingTableError, getPublishMode } from '@/lib/scheduled-posts';
import { loadBrandSnapshot } from '@/lib/marketing-brand-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/marketing/summary — indicadores del encabezado de /marketing.
 * Solo cuentas y banderas: sin textos, sin claves. Todo scopeado al workspace activo.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, MODULE_ACCESS['/marketing']);
  if (!isRoleContext(ctx)) return ctx;
  const workspaceId = ctx.workspace.id;
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 86400_000);
  const canContent = hasPermission(ctx.role, 'canManageContent');

  const posts = canContent
    ? await Promise.all([
        prisma.scheduledPost.count({ where: { workspaceId, status: 'scheduled', scheduledAt: { gte: now } } }),
        prisma.scheduledPost.count({ where: { workspaceId, status: 'failed' } }),
        prisma.scheduledPost.count({ where: { workspaceId, status: 'published', publishedAt: { gte: since } } }),
      ])
        .then(([upcoming, failed, published30]) => ({ available: true as const, upcoming, failed, published30 }))
        .catch((e) => {
          if (isMissingTableError(e)) return { available: false as const, upcoming: 0, failed: 0, published30: 0 };
          throw e;
        })
    : { available: false as const, upcoming: 0, failed: 0, published30: 0 };

  const [snippets, links, keys, brand] = await Promise.all([
    prisma.snippet.count({ where: { workspaceId } }),
    prisma.activationLink.aggregate({ where: { workspaceId }, _count: { _all: true }, _sum: { clicks: true } }),
    prisma.apiKey.findMany({ where: { workspaceId }, select: { provider: true } }),
    loadBrandSnapshot(workspaceId, false),
  ]);

  const providers = new Set(keys.map((k) => k.provider));
  return NextResponse.json({
    publishMode: getPublishMode(),
    canManageContent: canContent,
    canWrite: canWrite(ctx.role),
    posts,
    snippets,
    links: { count: links._count._all, clicks: links._sum.clicks ?? 0 },
    brandScore: brand.score,
    providers: {
      anthropic: providers.has('anthropic') || !!process.env.ANTHROPIC_API_KEY,
      google: providers.has('google') || !!process.env.GOOGLE_API_KEY,
    },
  });
}
