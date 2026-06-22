import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';

/**
 * POST  /api/contact-tasks  body: { contactId, title, dueAt? }
 * PATCH /api/contact-tasks  body: { id, done? , title?, dueAt? }
 * DELETE /api/contact-tasks?id=...
 */

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contactId, title, dueAt } = await req.json();
  if (!contactId || !title || !title.trim()) {
    return NextResponse.json({ error: 'contactId y title son requeridos' }, { status: 400 });
  }

  const ws = await getOrCreateWorkspace(auth.userId);
  const contact = await prisma.contact.findFirst({ where: { id: contactId, workspaceId: ws.id } });
  if (!contact) return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });

  const task = await prisma.contactTask.create({
    data: { contactId, title: title.trim(), dueAt: dueAt ? new Date(dueAt) : null },
  });
  return NextResponse.json({ task });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, done, title, dueAt } = await req.json();
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

  const ws = await getOrCreateWorkspace(auth.userId);
  const existing = await prisma.contactTask.findFirst({ where: { id, contact: { workspaceId: ws.id } } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const task = await prisma.contactTask.update({
    where: { id },
    data: {
      ...(done !== undefined ? { done } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
    },
  });
  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

  const ws = await getOrCreateWorkspace(auth.userId);
  const existing = await prisma.contactTask.findFirst({ where: { id, contact: { workspaceId: ws.id } } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.contactTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
