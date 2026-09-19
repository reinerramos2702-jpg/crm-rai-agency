import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { CAMPAIGN_ROLES, isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/campaigns
 * POST /api/campaigns  body: { name, pipelineType }
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, CAMPAIGN_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { updatedAt: 'desc' },
    include: { workspace: { select: { name: true } }, _count: { select: { executions: true } } },
  });
  return new Response(JSON.stringify({ campaigns }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Cache privado en navegador 5s + revalidación en background 30s → percepción instantánea al navegar.
      'Cache-Control': 'private, max-age=5, stale-while-revalidate=30',
    },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, CAMPAIGN_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const { name, pipelineType } = await req.json();

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.auth.userId,
      name: name || 'Untitled campaign',
      pipelineType: pipelineType || 'ugc',
      status: 'planning',
    },
  });
  return Response.json({ campaign });
}
