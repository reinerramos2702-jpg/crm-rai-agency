import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { CAMPAIGN_ROLES, isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/campaigns/[id] — detalle completo de campaña
 * DELETE /api/campaigns/[id] — eliminar campaña
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireRole(req, CAMPAIGN_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
    include: {
      executions: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          tasks: {
            orderBy: { index: 'asc' },
            include: {
              assets: {
                select: { kind: true, publicUrl: true, r2Key: true },
              },
            },
          },
        },
      },
    },
  });

  if (!campaign) return new Response('Not found', { status: 404 });
  return Response.json({ campaign });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireRole(req, CAMPAIGN_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });

  if (!campaign) return new Response('Not found', { status: 404 });

  // Eliminar en cascada (via Prisma)
  await prisma.campaign.delete({ where: { id: params.id } });

  return Response.json({ success: true });
}
