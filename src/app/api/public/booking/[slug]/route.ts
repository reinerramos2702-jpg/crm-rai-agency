import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runWorkflowsForEvent } from '@/lib/automations/engine';

export const runtime = 'nodejs';

/**
 * Endpoints públicos (sin auth) para la página de reserva /book/[slug]
 *
 * GET  /api/public/booking/[slug]?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   -> { calendar: { id, name, description, durationMins, availability }, busy: [{ startTime, endTime }] }
 *
 * POST /api/public/booking/[slug]  body: { startTime, endTime, name, email?, phone?, notes? }
 *   -> { appointment }
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const calendar = await prisma.calendarResource.findUnique({
    where: { bookingSlug: slug },
  });

  if (!calendar || !calendar.bookingEnabled || calendar.status !== 'active') {
    return NextResponse.json({ error: 'Calendario no disponible' }, { status: 404 });
  }

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  let busy: { startTime: Date; endTime: Date }[] = [];
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
      const appointments = await prisma.appointment.findMany({
        where: {
          calendarId: calendar.id,
          status: { not: 'cancelled' },
          startTime: { lt: toDate },
          endTime: { gt: fromDate },
        },
        select: { startTime: true, endTime: true },
      });
      busy = appointments;
    }
  }

  return NextResponse.json({
    calendar: {
      id: calendar.id,
      name: calendar.name,
      description: calendar.description,
      durationMins: calendar.durationMins,
      availability: calendar.availability,
    },
    busy,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const calendar = await prisma.calendarResource.findUnique({
    where: { bookingSlug: slug },
  });

  if (!calendar || !calendar.bookingEnabled || calendar.status !== 'active') {
    return NextResponse.json({ error: 'Calendario no disponible' }, { status: 404 });
  }

  const { startTime, endTime, name, email, phone, notes } = await req.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json({ error: 'Indica un email o teléfono de contacto' }, { status: 400 });
  }
  if (!startTime || !endTime) {
    return NextResponse.json({ error: 'Faltan datos de horario' }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: 'Horario inválido' }, { status: 400 });
  }
  if (start < new Date()) {
    return NextResponse.json({ error: 'No se puede reservar un horario en el pasado' }, { status: 400 });
  }

  // Verificar que el horario sigue libre (evita doble reserva por condición de carrera)
  const overlap = await prisma.appointment.findFirst({
    where: {
      calendarId: calendar.id,
      status: { not: 'cancelled' },
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });
  if (overlap) {
    return NextResponse.json({ error: 'Este horario ya no está disponible. Elige otro.' }, { status: 409 });
  }

  // Buscar o crear el contacto por email/teléfono dentro del workspace del calendario
  let contact = null;
  if (email) {
    contact = await prisma.contact.findFirst({ where: { workspaceId: calendar.workspaceId, email } });
  }
  if (!contact && phone) {
    contact = await prisma.contact.findFirst({ where: { workspaceId: calendar.workspaceId, phone } });
  }
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        workspaceId: calendar.workspaceId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        source: 'web',
      },
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      workspaceId: calendar.workspaceId,
      calendarId: calendar.id,
      contactId: contact.id,
      title: `${calendar.name} — ${name.trim()}`,
      notes: notes?.trim() || null,
      status: 'confirmed',
      startTime: start,
      endTime: end,
    },
    include: { contact: true, calendar: true },
  });

  await runWorkflowsForEvent(calendar.workspaceId, 'appointment.created', {
    workspaceId: calendar.workspaceId,
    contact: appointment.contact
      ? { id: appointment.contact.id, name: appointment.contact.name, email: appointment.contact.email, phone: appointment.contact.phone, tags: appointment.contact.tags }
      : null,
    appointment: { id: appointment.id, status: appointment.status, title: appointment.title, startTime: appointment.startTime, endTime: appointment.endTime },
    calendarId: appointment.calendarId,
  });

  return NextResponse.json({ appointment });
}
