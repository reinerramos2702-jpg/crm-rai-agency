import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.room.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Habitación no encontrada' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const data: Record<string, unknown> = {};
  for (const f of ['number', 'floor', 'status', 'notes', 'roomTypeId'] as const) {
    if (f in body) data[f] = body[f] === '' ? null : body[f];
  }

  const room = await prisma.room.update({ where: { id }, data });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'room.updated',
    entityType: 'room',
    entityId: id,
    meta: { fields: Object.keys(data) },
  });
  return NextResponse.json({ room });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.room.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { _count: { select: { bookings: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Habitación no encontrada' }, { status: 404 });
  if (existing._count.bookings > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: la habitación tiene reservas asociadas.' },
      { status: 409 }
    );
  }

  await prisma.room.delete({ where: { id } });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'room.deleted',
    entityType: 'room',
    entityId: id,
    meta: { number: existing.number },
  });
  return NextResponse.json({ ok: true });
}
