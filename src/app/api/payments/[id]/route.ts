import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const payment = await prisma.payment.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: {
      guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      booking: { select: { id: true, reference: true, checkInDate: true, checkOutDate: true } },
      site: { select: { id: true, name: true } },
      events: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  return NextResponse.json({ payment });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.payment.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const data: Record<string, unknown> = {};
  for (const f of ['method', 'proofUrl', 'transactionRef', 'notes', 'internalComments'] as const) {
    if (f in body) data[f] = body[f] === '' ? null : body[f];
  }
  if ('amountCents' in body) data.amountCents = Math.round(Number(body.amountCents));
  if ('currency' in body) data.currency = String(body.currency).toUpperCase();

  const payment = await prisma.payment.update({ where: { id }, data });
  await prisma.paymentEvent.create({
    data: {
      paymentId: id,
      actorUserId: ctx.auth.userId,
      action: 'updated',
      meta: { fields: Object.keys(data) },
    },
  });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'payment.updated',
    entityType: 'payment',
    entityId: id,
    meta: { fields: Object.keys(data) },
  });
  return NextResponse.json({ payment });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.payment.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  if (existing.status === 'paid') {
    return NextResponse.json(
      { error: 'No se puede eliminar un pago aprobado. Usa "reembolsar" en su lugar.' },
      { status: 409 }
    );
  }
  await prisma.payment.delete({ where: { id } });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'payment.deleted',
    entityType: 'payment',
    entityId: id,
    meta: { reference: existing.reference },
  });
  return NextResponse.json({ ok: true });
}
