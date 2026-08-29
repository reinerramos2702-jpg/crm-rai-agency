import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/audit — historial de actividad del workspace
 * Filtros opcionales: entityType, entityId, userId, from, to
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  const url = new URL(req.url);
  const entityType = url.searchParams.get('entityType') || '';
  const entityId = url.searchParams.get('entityId') || '';
  const userId = url.searchParams.get('userId') || '';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);

  const where: Record<string, unknown> = { workspaceId: ctx.workspace.id };
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ events });
}
