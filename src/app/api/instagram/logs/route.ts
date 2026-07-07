import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') || '';

  const where: Record<string, unknown> = { workspaceId: ctx.workspace.id };
  if (kind) where.kind = kind;

  const logs = await prisma.socialActionLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(
    { logs },
    { headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=30' } }
  );
}
