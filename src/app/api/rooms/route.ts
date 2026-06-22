import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const url = new URL(req.url);
  const siteId = url.searchParams.get('siteId') || undefined;
  const status = url.searchParams.get('status') || undefined;

  const rooms = await prisma.room.findMany({
    where: {
      workspaceId: ctx.workspace.id,
      ...(siteId ? { siteId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ siteId: 'asc' }, { number: 'asc' }],
    include: {
      site: { select: { id: true, name: true } },
      roomType: { select: { id: true, name: true, basePriceCents: true, currency: true } },
    },
  });

  return NextResponse.json({ rooms });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const siteId = String(body.siteId || '');
  const number = String(body.number || '').trim();
  if (!siteId || !number) return NextResponse.json({ error: 'siteId y number son obligatorios' }, { status: 400 });

  const site = await prisma.site.findFirst({ where: { id: siteId, workspaceId: ctx.workspace.id } });
  if (!site) return NextResponse.json({ error: 'Sitio no encontrado' }, { status: 404 });

  try {
    const room = await prisma.room.create({
      data: {
        workspaceId: ctx.workspace.id,
        siteId,
        roomTypeId: body.roomTypeId ? String(body.roomTypeId) : null,
        number,
        floor: body.floor ? String(body.floor) : null,
        status: body.status ? String(body.status) : 'available',
        notes: body.notes ? String(body.notes) : null,
      },
    });
    await logAudit({
      workspaceId: ctx.workspace.id,
      userId: ctx.auth.userId,
      action: 'room.created',
      entityType: 'room',
      entityId: room.id,
      meta: { siteId, number },
    });
    return NextResponse.json({ room }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unique')) {
      return NextResponse.json({ error: 'Ya existe una habitación con ese número en este sitio' }, { status: 409 });
    }
    throw err;
  }
}
