import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';

/**
 * PATCH  /api/calendars/[id]  body: { name?, description?, type?, durationMins?, status?, groupId?,
 *                                      bookingEnabled?, availability? }
 * DELETE /api/calendars/[id]
 */

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const DEFAULT_AVAILABILITY = {
  mon: [{ start: '09:00', end: '18:00' }],
  tue: [{ start: '09:00', end: '18:00' }],
  wed: [{ start: '09:00', end: '18:00' }],
  thu: [{ start: '09:00', end: '18:00' }],
  fri: [{ start: '09:00', end: '18:00' }],
  sat: [],
  sun: [],
};

async function assertOwnership(workspaceId: string, id: string) {
  return prisma.calendarResource.findFirst({ where: { id, workspaceId } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ws = await getOrCreateWorkspace(auth.userId);
  const owned = await assertOwnership(ws.id, id);
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { name, description, type, durationMins, status, groupId, bookingEnabled, availability } = await req.json();

  if (groupId) {
    const group = await prisma.calendarGroup.findFirst({ where: { id: groupId, workspaceId: ws.id } });
    if (!group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
  }

  // Generar slug de reserva la primera vez que se activa "Aceptar reservas"
  let bookingSlug: string | undefined;
  if (bookingEnabled === true && !owned.bookingSlug) {
    let candidate = slugify(owned.name) || `cal-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.calendarResource.findUnique({ where: { bookingSlug: candidate } });
      if (!exists) break;
      candidate = `${slugify(owned.name) || 'cal'}-${Math.random().toString(36).slice(2, 5)}`;
    }
    bookingSlug = candidate;
  }

  const calendar = await prisma.calendarResource.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(durationMins !== undefined ? { durationMins: Number(durationMins) } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(groupId !== undefined ? { groupId: groupId || null } : {}),
      ...(bookingEnabled !== undefined ? { bookingEnabled } : {}),
      ...(bookingSlug !== undefined ? { bookingSlug } : {}),
      ...(availability !== undefined ? { availability: availability ?? DEFAULT_AVAILABILITY } : {}),
      // Si se activa por primera vez y no hay disponibilidad configurada, usar la default
      ...(bookingEnabled === true && !owned.availability && availability === undefined
        ? { availability: DEFAULT_AVAILABILITY }
        : {}),
    },
    include: { group: true },
  });

  return NextResponse.json({ calendar });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ws = await getOrCreateWorkspace(auth.userId);
  const owned = await assertOwnership(ws.id, id);
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.$transaction([
    prisma.appointment.deleteMany({ where: { calendarId: id } }),
    prisma.calendarResource.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
