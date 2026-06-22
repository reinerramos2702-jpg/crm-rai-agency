import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const booking = await prisma.booking.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: {
      guest: true,
      site: true,
      room: { include: { roomType: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  return NextResponse.json({ booking });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.booking.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const data: Record<string, unknown> = {};

  if ('status' in body) {
    const next = String(body.status);
    if (!ALLOWED_STATUSES.includes(next as typeof ALLOWED_STATUSES[number])) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }
    data.status = next;
    if (next === 'checked_in') data.actualCheckIn = new Date();
    if (next === 'checked_out') data.actualCheckOut = new Date();
  }

  for (const f of ['roomId', 'source', 'specialRequests', 'internalNotes', 'cancelledReason'] as const) {
    if (f in body) data[f] = body[f] === '' ? null : body[f];
  }
  if ('adults' in body) data.adults = Number(body.adults) || 1;
  if ('children' in body) data.children = Number(body.children) || 0;
  if ('totalAmountCents' in body) data.totalAmountCents = Number(body.totalAmountCents) || 0;
  if ('checkInDate' in body) data.checkInDate = new Date(String(body.checkInDate));
  if ('checkOutDate' in body) data.checkOutDate = new Date(String(body.checkOutDate));

  const booking = await prisma.booking.update({ where: { id }, data });

  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: `booking.${data.status ? `status_${String(data.status)}` : 'updated'}`,
    entityType: 'booking',
    entityId: id,
    meta: { from: existing.status, to: data.status ?? existing.status },
  });

  // Si la reserva pasa a checked_out, denormalizar stats del huésped
  if (data.status === 'checked_out') {
    const paidAgg = await prisma.payment.aggregate({
      where: { bookingId: id, status: 'paid' },
      _sum: { amountCents: true },
    });
    await prisma.guest.update({
      where: { id: existing.guestId },
      data: {
        totalStays: { increment: 1 },
        totalSpentCents: { increment: paidAgg._sum.amountCents ?? 0 },
        lastStayAt: new Date(),
      },
    });
  }

  return NextResponse.json({ booking });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.booking.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { _count: { select: { payments: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  if (existing._count.payments > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: la reserva tiene pagos asociados. Cámbiala a "cancelada".' },
      { status: 409 }
    );
  }

  await prisma.booking.delete({ where: { id } });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'booking.deleted',
    entityType: 'booking',
    entityId: id,
    meta: { reference: existing.reference },
  });
  return NextResponse.json({ ok: true });
}
