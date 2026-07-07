import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

/**
 * POST /api/payments/[id]/transition
 * body: { action: 'approve' | 'reject' | 'refund' | 'cancel' | 'review', refundAmountCents?, reason? }
 *
 * Transiciones permitidas (máquina de estados):
 *  pending → paid (approve) | failed (reject) | cancelled (cancel) | under_review (review)
 *  under_review → paid (approve) | failed (reject) | cancelled (cancel)
 *  paid → refunded (refund con monto)
 */

type Action = 'approve' | 'reject' | 'refund' | 'cancel' | 'review';

const TRANSITIONS: Record<string, Partial<Record<Action, string>>> = {
  pending: { approve: 'paid', reject: 'failed', cancel: 'cancelled', review: 'under_review' },
  under_review: { approve: 'paid', reject: 'failed', cancel: 'cancelled' },
  paid: { refund: 'refunded' },
  failed: { review: 'under_review' },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.payment.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const action = String(body.action || '') as Action;
  const next = TRANSITIONS[existing.status]?.[action];
  if (!next) {
    return NextResponse.json(
      { error: `Transición no permitida: ${existing.status} → ${action}` },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = { status: next };
  const eventMeta: Record<string, unknown> = { from: existing.status, to: next };

  if (action === 'approve') {
    data.paidAt = new Date();
    data.approvedById = ctx.auth.userId;
    data.approvedAt = new Date();
  }
  if (action === 'refund') {
    const refundCents = Math.round(Number(body.refundAmountCents) || existing.amountCents);
    if (refundCents <= 0 || refundCents > existing.amountCents) {
      return NextResponse.json(
        { error: `Monto a reembolsar inválido (0 - ${existing.amountCents})` },
        { status: 400 }
      );
    }
    data.refundedAmountCents = refundCents;
    data.refundedAt = new Date();
    eventMeta.refundCents = refundCents;
  }
  if (action === 'cancel' || action === 'reject') {
    if (body.reason) eventMeta.reason = String(body.reason);
  }

  const payment = await prisma.payment.update({ where: { id }, data });

  await prisma.paymentEvent.create({
    data: {
      paymentId: id,
      actorUserId: ctx.auth.userId,
      action,
      fromStatus: existing.status,
      toStatus: next,
      meta: eventMeta as object,
    },
  });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: `payment.${action}`,
    entityType: 'payment',
    entityId: id,
    meta: eventMeta,
  });

  // Si approve + bookingId, incrementar paidAmountCents
  if (action === 'approve' && payment.bookingId) {
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paidAmountCents: { increment: payment.amountCents } },
    });
  }
  // Si refund + bookingId, decrementar
  if (action === 'refund' && payment.bookingId) {
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paidAmountCents: { decrement: Number(data.refundedAmountCents) || 0 } },
    });
  }

  return NextResponse.json({ payment });
}
