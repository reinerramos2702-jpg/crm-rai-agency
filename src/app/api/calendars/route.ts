import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/calendars — lista calendarios del workspace (con grupo)
 * POST /api/calendars  body: { name, description?, type?, durationMins?, groupId? }
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'staff', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const calendars = await prisma.calendarResource.findMany({
    where: { workspaceId: ws.id },
    include: { group: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ calendars });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const { name, description, type, durationMins, groupId, availability } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }

  if (groupId) {
    const group = await prisma.calendarGroup.findFirst({ where: { id: groupId, workspaceId: ws.id } });
    if (!group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
  }

  const calendar = await prisma.calendarResource.create({
    data: {
      workspaceId: ws.id,
      name: name.trim(),
      description: description?.trim() || null,
      type: type || 'personal',
      durationMins: durationMins ? Number(durationMins) : 30,
      groupId: groupId || null,
      ...(availability !== undefined ? { availability } : {}),
    },
    include: { group: true },
  });
  return NextResponse.json({ calendar });
}
