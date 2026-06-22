import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';
import { runWorkflowsForEvent } from '@/lib/automations/engine';

export const runtime = 'nodejs';

/**
 * PATCH  /api/appointments/[id]  body: { title?, notes?, startTime?, endTime?, status?, calendarId?, contactId? }
 * DELETE /api/appointments/[id]
 */

async function assertOwnership(workspaceId: string, id: string) {
  return prisma.appointment.findFirst({ where: { id, workspaceId } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ws = await getOrCreateWorkspace(auth.userId);
  const owned = await assertOwnership(ws.id, id);
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { title, notes, startTime, endTime, status, calendarId, contactId } = await req.json();

  let start: Date | undefined;
  let end: Date | undefined;
  if (startTime !== undefined) start = new Date(startTime);
  if (endTime !== undefined) end = new Date(endTime);
  if (start && Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: 'startTime inválido' }, { status: 400 });
  }
  if (end && Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: 'endTime inválido' }, { status: 400 });
  }
  const finalStart = start ?? owned.startTime;
  const finalEnd = end ?? owned.endTime;
  if (finalEnd <= finalStart) {
    return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 });
  }

  if (calendarId) {
    const calendar = await prisma.calendarResource.findFirst({ where: { id: calendarId, workspaceId: ws.id } });
    if (!calendar) return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
  }
  if (contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, workspaceId: ws.id } });
    if (!contact) return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(start !== undefined ? { startTime: start } : {}),
      ...(end !== undefined ? { endTime: end } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(calendarId !== undefined ? { calendarId } : {}),
      ...(contactId !== undefined ? { contactId: contactId || null } : {}),
    },
    include: { contact: true, calendar: true },
  });

  if (status !== undefined && status !== owned.status) {
    await runWorkflowsForEvent(ws.id, 'appointment.status_changed', {
      workspaceId: ws.id,
      contact: appointment.contact
        ? { id: appointment.contact.id, name: appointment.contact.name, email: appointment.contact.email, phone: appointment.contact.phone, tags: appointment.contact.tags }
        : null,
      appointment: { id: appointment.id, status: appointment.status, title: appointment.title, startTime: appointment.startTime, endTime: appointment.endTime },
      newStatus: status,
    });
  }

  return NextResponse.json({ appointment });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ws = await getOrCreateWorkspace(auth.userId);
  const owned = await assertOwnership(ws.id, id);
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
