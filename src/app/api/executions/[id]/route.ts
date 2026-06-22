import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const execution = await prisma.execution.findFirst({
    where: { id: params.id, userId: auth.userId },
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
