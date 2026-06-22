import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';

/**
 * GET  /api/calendars — lista calendarios del workspace (con grupo)
 * POST /api/calendars  body: { name, description?, type?, durationMins?, groupId? }
 */

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ws = await getOrCreateWorkspace(auth.userId);
  const calendars = await prisma.calendarResource.findMany({
    where: { workspaceId: ws.id },
    include: { group: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ calendars });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, type, durationMins, groupId, availability } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }

  const ws = await getOrCreateWorkspace(auth.userId);

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
