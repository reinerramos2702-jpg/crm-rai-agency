import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

/**
 * GET  /api/guests — lista huéspedes con filtros (q, status)
 * POST /api/guests — crea un huésped nuevo
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const status = url.searchParams.get('status') || '';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);

  const where: Record<string, unknown> = { workspaceId: ctx.workspace.id };
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { documentNumber: { contains: q } },
    ];
  }

  const [guests, totals] = await Promise.all([
    prisma.guest.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { _count: { select: { bookings: true, payments: true } } },
    }),
    prisma.guest.groupBy({
      by: ['status'],
      where: { workspaceId: ctx.workspace.id },
      _count: true,
    }),
  ]);

  const totalsByStatus: Record<string, number> = {};
  for (const row of totals) totalsByStatus[row.status] = row._count;

  return NextResponse.json(
    { guests, totalsByStatus, total: guests.length },
    { headers: { 'Cache-Control': 'private, max-age=3, stale-while-revalidate=20' } }
  );
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const firstName = String(body.firstName || '').trim();
  if (!firstName) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }

  const guest = await prisma.guest.create({
    data: {
      workspaceId: ctx.workspace.id,
      firstName,
      lastName: body.lastName ? String(body.lastName).trim() : null,
      email: body.email ? String(body.email).trim().toLowerCase() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      documentType: body.documentType ? String(body.documentType) : null,
      documentNumber: body.documentNumber ? String(body.documentNumber).trim() : null,
      nationality: body.nationality ? String(body.nationality).trim() : null,
      dateOfBirth: body.dateOfBirth ? new Date(String(body.dateOfBirth)) : null,
      emergencyContactName: body.emergencyContactName ? String(body.emergencyContactName).trim() : null,
      emergencyContactPhone: body.emergencyContactPhone ? String(body.emergencyContactPhone).trim() : null,
      status: body.status ? String(body.status) : 'active',
      preferredLanguage: body.preferredLanguage ? String(body.preferredLanguage) : null,
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
      notes: body.notes ? String(body.notes) : null,
      contactId: body.contactId ? String(body.contactId) : null,
    },
  });

  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'guest.created',
    entityType: 'guest',
    entityId: guest.id,
    meta: { firstName: guest.firstName, lastName: guest.lastName },
  });

  return NextResponse.json({ guest }, { status: 201 });
}
