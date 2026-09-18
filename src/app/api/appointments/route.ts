import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { runWorkflowsForEvent } from '@/lib/automations/engine';

export const runtime = 'nodejs';

/**
 * GET  /api/appointments?from=ISO&to=ISO&calendarId=...&status=...
 *      lista citas del workspace, opcionalmente filtradas por rango de fechas,
 *      calendario y estado. Incluye datos del contacto y calendario.
 * POST /api/appointments  body: { calendarId, contactId?, title, notes?, startTime, endTime, status? }
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'staff', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const calendarId = req.nextUrl.searchParams.get('calendarId');
  const status = req.nextUrl.searchParams.get('status');

  const where: Record<string, unknown> = { workspaceId: ws.id };
  if (calendarId) where.calendarId = calendarId;
  if (status) where.status = status;
  if (from || to) {
    where.startTime = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { contact: true, calendar: true },
    orderBy: { startTime: 'asc' },
  });

  return NextResponse.json({ appointments });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const { calendarId, contactId, title, notes, startTime, endTime, status } = await req.json();

  if (!calendarId || !title || !title.trim() || !startTime || !endTime) {
    return NextResponse.json(
      { error: 'calendarId, title, startTime y endTime son requeridos' },
      { status: 400 }
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 });
  }

  const calendar = await prisma.calendarResource.findFirst({ where: { id: calendarId, workspaceId: ws.id } });
  if (!calendar) return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });

  if (contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, workspaceId: ws.id } });
    if (!contact) return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      workspaceId: ws.id,
      calendarId,
      contactId: contactId || null,
      title: title.trim(),
      notes: notes?.trim() || null,
      startTime: start,
      endTime: end,
      status: status || 'confirmed',
    },
    include: { contact: true, calendar: true },
  });

  await runWorkflowsForEvent(ws.id, 'appointment.created', {
    workspaceId: ws.id,
    contact: appointment.contact
      ? { id: appointment.contact.id, name: appointment.contact.name, email: appointment.contact.email, phone: appointment.contact.phone, tags: appointment.contact.tags }
      : null,
    appointment: { id: appointment.id, status: appointment.status, title: appointment.title, startTime: appointment.startTime, endTime: appointment.endTime },
    calendarId: appointment.calendarId,
  });

  return NextResponse.json({ appointment });
}
