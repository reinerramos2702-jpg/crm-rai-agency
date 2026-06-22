import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit, generateReference } from '@/lib/audit';

export const runtime = 'nodejs';

/**
 * GET  /api/bookings — lista reservas con filtros (status, siteId, from, to, q)
 * POST /api/bookings — crea reserva nueva
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || '';
  const siteId = url.searchParams.get('siteId') || '';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const q = url.searchParams.get('q')?.trim() || '';

  const where: Record<string, unknown> = { workspaceId: ctx.workspace.id };
  if (status) where.status = status;
  if (siteId) where.siteId = siteId;
  if (from || to) {
    where.checkInDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { guest: { firstName: { contains: q, mode: 'insensitive' } } },
      { guest: { lastName: { contains: q, mode: 'insensitive' } } },
      { guest: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [bookings, summary] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { checkInDate: 'desc' },
      take: 200,
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        site: { select: { id: true, name: true } },
        room: { select: { id: true, number: true } },
      },
    }),
    prisma.booking.groupBy({
      by: ['status'],
      where: { workspaceId: ctx.workspace.id },
      _count: true,
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of summary) byStatus[row.status] = row._count;

  return NextResponse.json({ bookings, byStatus });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const guestId = String(body.guestId || '');
  const siteId = String(body.siteId || '');
  const checkInDate = body.checkInDate ? new Date(String(body.checkInDate)) : null;
  const checkOutDate = body.checkOutDate ? new Date(String(body.checkOutDate)) : null;

  if (!guestId || !siteId || !checkInDate || !checkOutDate) {
    return NextResponse.json(
      { error: 'guestId, siteId, checkInDate y checkOutDate son obligatorios' },
      { status: 400 }
    );
  }
  if (checkOutDate <= checkInDate) {
    return NextResponse.json(
      { error: 'La fecha de salida debe ser posterior a la de entrada' },
      { status: 400 }
    );
  }

  // Validar pertenencia al workspace
  const [guest, site] = await Promise.all([
    prisma.guest.findFirst({ where: { id: guestId, workspaceId: ctx.workspace.id } }),
    prisma.site.findFirst({ where: { id: siteId, workspaceId: ctx.workspace.id } }),
  ]);
  if (!guest || !site) return NextResponse.json({ error: 'Huésped o sitio no encontrado' }, { status: 404 });

  // Verificar disponibilidad de la habitación (si se especifica)
  if (body.roomId) {
    const overlap = await prisma.booking.findFirst({
      where: {
        roomId: String(body.roomId),
        status: { notIn: ['cancelled', 'no_show'] },
        OR: [
          { checkInDate: { lt: checkOutDate }, checkOutDate: { gt: checkInDate } },
        ],
      },
    });
    if (overlap) {
      return NextResponse.json(
        { error: `Habitación ocupada en esas fechas (reserva ${overlap.reference})` },
        { status: 409 }
      );
    }
  }

  // Referencia única
  let reference = generateReference('BK');
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.booking.findUnique({ where: { reference } });
    if (!exists) break;
    reference = generateReference('BK');
  }

  const booking = await prisma.booking.create({
    data: {
      workspaceId: ctx.workspace.id,
      guestId,
      siteId,
      roomId: body.roomId ? String(body.roomId) : null,
      reference,
      status: body.status ? String(body.status) : 'pending',
      checkInDate,
      checkOutDate,
      adults: Number(body.adults) || 1,
      children: Number(body.children) || 0,
      source: body.source ? String(body.source) : 'direct',
      totalAmountCents: Number(body.totalAmountCents) || 0,
      currency: body.currency ? String(body.currency).toUpperCase() : 'USD',
      specialRequests: body.specialRequests ? String(body.specialRequests) : null,
      internalNotes: body.internalNotes ? String(body.internalNotes) : null,
    },
    include: {
      guest: { select: { firstName: true, lastName: true } },
      site: { select: { name: true } },
    },
  });

  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'booking.created',
    entityType: 'booking',
    entityId: booking.id,
    meta: { reference: booking.reference, guestId, siteId },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
