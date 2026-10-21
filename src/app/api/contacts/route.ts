import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { runWorkflowsForEvent } from '@/lib/automations/engine';

export const runtime = 'nodejs';

/**
 * GET  /api/contacts — lista contactos del workspace, con su última conversación
 * POST /api/contacts  body: { name, email?, phone?, source? }
 *      Crea el contacto y, opcionalmente, una conversación 'manual' inicial.
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'staff', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

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
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const { name, email, phone, source } = await req.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }

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
