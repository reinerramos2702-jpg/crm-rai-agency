import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';
import { runWorkflowsForEvent } from '@/lib/automations/engine';

export const runtime = 'nodejs';

/**
 * GET  /api/contacts — lista contactos del workspace, con su última conversación
 * POST /api/contacts  body: { name, email?, phone?, source? }
 *      Crea el contacto y, opcionalmente, una conversación 'manual' inicial.
 */

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ws = await getOrCreateWorkspace(auth.userId);

  const contacts = await prisma.contact.findMany({
    where: { workspaceId: ws.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      conversations: {
        orderBy: { lastMessageAt: 'desc' },
        take: 1,
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, email, phone, source } = await req.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }

  const ws = await getOrCreateWorkspace(auth.userId);

  const contact = await prisma.contact.create({
    data: {
      workspaceId: ws.id,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      source: source || 'manual',
      conversations: {
        create: { channel: 'manual', status: 'open' },
      },
    },
    include: { conversations: true },
  });

  await runWorkflowsForEvent(ws.id, 'contact.created', {
    workspaceId: ws.id,
    contact: { id: contact.id, name: contact.name, email: contact.email, phone: contact.phone, tags: contact.tags },
    source: contact.source || 'manual',
  });

  return NextResponse.json({ contact });
}
