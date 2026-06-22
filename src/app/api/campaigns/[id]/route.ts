import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET  /api/campaigns/[id] — detalle completo de campaña
 * DELETE /api/campaigns/[id] — eliminar campaña
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: auth.userId },
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
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: auth.userId },
  });

  if (!campaign) return new Response('Not found', { status: 404 });

  // Eliminar en cascada (via Prisma)
  await prisma.campaign.delete({ where: { id: params.id } });

  return Response.json({ success: true });
}
