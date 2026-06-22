import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET  /api/campaigns
 * POST /api/campaigns  body: { workspaceId, name, pipelineType }
 */

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    where: { userId: auth.userId },
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
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const { workspaceId, name, pipelineType } = await req.json();

  // Auto-crear workspace dev si no existe
  let ws = workspaceId
    ? await prisma.workspace.findFirst({ where: { id: workspaceId, ownerId: auth.userId } })
    : await prisma.workspace.findFirst({ where: { ownerId: auth.userId } });

  if (!ws) {
    ws = await prisma.workspace.create({
      data: { ownerId: auth.userId, name: 'Default Workspace' },
    });
  }

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ws.id,
      userId: auth.userId,
      name: name || 'Untitled campaign',
      pipelineType: pipelineType || 'ugc',
      status: 'planning',
    },
  });
  return Response.json({ campaign });
}
