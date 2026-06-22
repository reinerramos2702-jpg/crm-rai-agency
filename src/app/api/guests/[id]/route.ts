import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const guest = await prisma.guest.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: {
      bookings: {
        orderBy: { checkInDate: 'desc' },
        include: { site: { select: { id: true, name: true } }, room: { select: { id: true, number: true } } },
      },
      payments: { orderBy: { createdAt: 'desc' } },
      contact: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!guest) return NextResponse.json({ error: 'Huésped no encontrado' }, { status: 404 });
  return NextResponse.json({ guest });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.guest.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!existing) return NextResponse.json({ error: 'Huésped no encontrado' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  const fields = [
    'firstName', 'lastName', 'email', 'phone', 'documentType', 'documentNumber',
    'nationality', 'emergencyContactName', 'emergencyContactPhone', 'status',
    'preferredLanguage', 'notes', 'contactId',
  ] as const;
  for (const f of fields) if (f in body) data[f] = body[f] === '' ? null : body[f];
  if ('tags' in body && Array.isArray(body.tags)) data.tags = body.tags;
  if ('dateOfBirth' in body) data.dateOfBirth = body.dateOfBirth ? new Date(String(body.dateOfBirth)) : null;

  const guest = await prisma.guest.update({ where: { id }, data });

  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'guest.updated',
    entityType: 'guest',
    entityId: id,
    meta: { fields: Object.keys(data) },
  });

  return NextResponse.json({ guest });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.guest.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { _count: { select: { bookings: true, payments: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Huésped no encontrado' }, { status: 404 });
  if (existing._count.bookings > 0 || existing._count.payments > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: huésped tiene reservas o pagos asociados. Cámbialo a estado "inactivo".' },
      { status: 409 }
    );
  }

  await prisma.guest.delete({ where: { id } });
  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'guest.deleted',
    entityType: 'guest',
    entityId: id,
    meta: { firstName: existing.firstName },
  });
  return NextResponse.json({ ok: true });
}
