import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const site = await prisma.site.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: {
      rooms: { orderBy: { number: 'asc' }, include: { roomType: { select: { id: true, name: true } } } },
      _count: { select: { bookings: true, payments: true } },
    },
  });
  if (!site) return NextResponse.json({ error: 'Sitio no encontrado' }, { status: 404 });

  // Métricas operativas rápidas
  const [activeBookings, monthRevenue] = await Promise.all([
    prisma.booking.count({
      where: { siteId: id, status: { in: ['confirmed', 'checked_in'] } },
    }),
    prisma.payment.aggregate({
      where: {
        siteId: id,
        status: 'paid',
        paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amountCents: true },
    }),
  ]);

  return NextResponse.json({
    site,
    metrics: {
      activeBookings,
      monthRevenueCents: monthRevenue._sum.amountCents ?? 0,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.site.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Sitio no encontrado' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const data: Record<string, unknown> = {};
  const fields = [
    'name', 'type', 'address', 'city', 'country', 'postalCode',
    'contactName', 'contactPhone', 'contactEmail', 'status', 'notes',
  ] as const;
  for (const f of fields) if (f in body) data[f] = body[f] === '' ? null : body[f];
  if ('capacity' in body) data.capacity = Number(body.capacity) || 0;
  if ('latitude' in body) data.latitude = body.latitude === null ? null : Number(body.latitude);
  if ('longitude' in body) data.longitude = body.longitude === null ? null : Number(body.longitude);

  const site = await prisma.site.update({ where: { id }, data });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'site.updated',
    entityType: 'site',
    entityId: id,
    meta: { fields: Object.keys(data) },
  });
  return NextResponse.json({ site });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.site.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { _count: { select: { rooms: true, bookings: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Sitio no encontrado' }, { status: 404 });
  if (existing._count.rooms > 0 || existing._count.bookings > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: el sitio tiene habitaciones o reservas. Cámbialo a estado "cerrado".' },
      { status: 409 }
    );
  }

  await prisma.site.delete({ where: { id } });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'site.deleted',
    entityType: 'site',
    entityId: id,
    meta: { name: existing.name },
  });
  return NextResponse.json({ ok: true });
}
