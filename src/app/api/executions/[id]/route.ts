import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { CAMPAIGN_ROLES, isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireRole(req, CAMPAIGN_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const execution = await prisma.execution.findFirst({
    where: { id: params.id, campaign: { workspaceId: ctx.workspace.id } },
    include: {
      tasks: {
        orderBy: { index: 'asc' },
        include: { assets: true },
      },
    },
  });
  if (!execution) return new Response('Not found', { status: 404 });
  return Response.json({ execution });
}
