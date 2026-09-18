import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { runWorkflowsForEvent } from '@/lib/automations/engine';

export const runtime = 'nodejs';

/**
 * GET    /api/contacts/[id] — detalle de un contacto: conversaciones+mensajes, notas, tareas
 * PATCH  /api/contacts/[id]  body: { name?, email?, phone?, tags? }
 * DELETE /api/contacts/[id]
 */

async function assertOwnership(workspaceId: string, contactId: string) {
  return prisma.contact.findFirst({ where: { id: contactId, workspaceId } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'staff', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;
  const { id } = await params;

  const owned = await assertOwnership(ws.id, id);
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      conversations: {
        orderBy: { createdAt: 'asc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      },
      notes: { orderBy: { createdAt: 'desc' } },
      contactTasks: { orderBy: { createdAt: 'desc' } },
    },
  });

  return NextResponse.json({ contact });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;
  const { id } = await params;

  const owned = await assertOwnership(ws.id, id);
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { name, email, phone, tags } = await req.json();

  const previousTags: string[] = owned.tags || [];

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(tags !== undefined ? { tags } : {}),
    },
  });

  // Disparar 'contact.tag_added' por cada tag nuevo (uno a la vez, en orden)
  if (tags !== undefined && Array.isArray(tags)) {
    const newTags = tags.filter((t: string) => !previousTags.includes(t));
    for (const tag of newTags) {
      await runWorkflowsForEvent(ws.id, 'contact.tag_added', {
        workspaceId: ws.id,
        contact: { id: contact.id, name: contact.name, email: contact.email, phone: contact.phone, tags: contact.tags },
        tag,
      });
    }
  }

  return NextResponse.json({ contact });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;
  const { id } = await params;

  const owned = await assertOwnership(ws.id, id);
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const conversations = await prisma.conversation.findMany({ where: { contactId: id }, select: { id: true } });
  const conversationIds = conversations.map((c: { id: string }) => c.id);

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } }),
    prisma.conversation.deleteMany({ where: { contactId: id } }),
    prisma.note.deleteMany({ where: { contactId: id } }),
    prisma.contactTask.deleteMany({ where: { contactId: id } }),
    prisma.contact.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
