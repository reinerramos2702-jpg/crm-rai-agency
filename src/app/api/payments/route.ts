import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit, generateReference } from '@/lib/audit';

export const runtime = 'nodejs';

/**
 * GET  /api/payments — lista pagos con filtros (status, method, from, to, guestId, bookingId, siteId, q)
 *                       + totales agregados (paid, pending, refunded)
 * POST /api/payments — crea pago
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || '';
  const method = url.searchParams.get('method') || '';
  const guestId = url.searchParams.get('guestId') || '';
  const bookingId = url.searchParams.get('bookingId') || '';
  const siteId = url.searchParams.get('siteId') || '';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const q = url.searchParams.get('q')?.trim() || '';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);

  const where: Record<string, unknown> = { workspaceId: ctx.workspace.id };
  if (status) where.status = status;
  if (method) where.method = method;
  if (guestId) where.guestId = guestId;
  if (bookingId) where.bookingId = bookingId;
  if (siteId) where.siteId = siteId;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { transactionRef: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [payments, byStatus, paidSum, pendingSum, refundedSum] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        guest: { select: { id: true, firstName: true, lastName: true } },
        booking: { select: { id: true, reference: true } },
        site: { select: { id: true, name: true } },
      },
    }),
    prisma.payment.groupBy({
      by: ['status'],
      where: { workspaceId: ctx.workspace.id },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { workspaceId: ctx.workspace.id, status: 'paid' },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: { workspaceId: ctx.workspace.id, status: { in: ['pending', 'under_review'] } },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: { workspaceId: ctx.workspace.id, status: 'refunded' },
      _sum: { refundedAmountCents: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of byStatus) statusCounts[row.status] = row._count;

  return NextResponse.json({
    payments,
    summary: {
      paidCents: paidSum._sum.amountCents ?? 0,
      pendingCents: pendingSum._sum.amountCents ?? 0,
      refundedCents: refundedSum._sum.refundedAmountCents ?? 0,
      statusCounts,
    },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const amountCents = Math.round(Number(body.amountCents));
  if (!amountCents || amountCents <= 0) {
    return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
  }

  // Validar relaciones opcionales
  if (body.guestId) {
    const g = await prisma.guest.findFirst({ where: { id: String(body.guestId), workspaceId: ctx.workspace.id } });
    if (!g) return NextResponse.json({ error: 'Huésped no encontrado' }, { status: 404 });
  }
  if (body.bookingId) {
    const b = await prisma.booking.findFirst({ where: { id: String(body.bookingId), workspaceId: ctx.workspace.id } });
    if (!b) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }
  if (body.siteId) {
    const s = await prisma.site.findFirst({ where: { id: String(body.siteId), workspaceId: ctx.workspace.id } });
    if (!s) return NextResponse.json({ error: 'Sitio no encontrado' }, { status: 404 });
  }

  // Referencia única
  let reference = generateReference('PAY');
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.payment.findUnique({ where: { reference } });
    if (!exists) break;
    reference = generateReference('PAY');
  }

  const status = body.status ? String(body.status) : 'pending';

  const payment = await prisma.payment.create({
    data: {
      workspaceId: ctx.workspace.id,
      reference,
      guestId: body.guestId ? String(body.guestId) : null,
      bookingId: body.bookingId ? String(body.bookingId) : null,
      siteId: body.siteId ? String(body.siteId) : null,
      amountCents,
      currency: body.currency ? String(body.currency).toUpperCase() : 'USD',
      method: body.method ? String(body.method) : 'cash',
      status,
      paidAt: status === 'paid' ? new Date() : null,
      proofUrl: body.proofUrl ? String(body.proofUrl) : null,
      transactionRef: body.transactionRef ? String(body.transactionRef) : null,
      notes: body.notes ? String(body.notes) : null,
      internalComments: body.internalComments ? String(body.internalComments) : null,
      createdById: ctx.auth.userId,
    },
  });

  await prisma.paymentEvent.create({
    data: {
      paymentId: payment.id,
      actorUserId: ctx.auth.userId,
      action: 'created',
      toStatus: status,
      meta: { amountCents, currency: payment.currency, method: payment.method },
    },
  });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'payment.created',
    entityType: 'payment',
    entityId: payment.id,
    meta: { reference, amountCents, currency: payment.currency },
  });

  // Si paid + bookingId, actualizar paidAmountCents en booking
  if (status === 'paid' && payment.bookingId) {
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paidAmountCents: { increment: amountCents } },
    });
  }

  return NextResponse.json({ payment }, { status: 201 });
}
