import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const roomTypes = await prisma.roomType.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { name: 'asc' },
    include: { _count: { select: { rooms: true } } },
  });
  return NextResponse.json({ roomTypes });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });

  const roomType = await prisma.roomType.create({
    data: {
      workspaceId: ctx.workspace.id,
      name,
      description: body.description ? String(body.description) : null,
      basePriceCents: Number(body.basePriceCents) || 0,
      currency: body.currency ? String(body.currency).toUpperCase() : 'USD',
      maxOccupancy: Number(body.maxOccupancy) || 2,
      amenities: Array.isArray(body.amenities) ? (body.amenities as string[]) : [],
    },
  });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'room_type.created',
    entityType: 'room_type',
    entityId: roomType.id,
    meta: { name: roomType.name },
  });
  return NextResponse.json({ roomType }, { status: 201 });
}
