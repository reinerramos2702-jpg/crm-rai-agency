import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * POST   /api/notes  body: { contactId, body }
 * DELETE /api/notes?id=...
 */

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const { contactId, body } = await req.json();
  if (!contactId || !body || !body.trim()) {
    return NextResponse.json({ error: 'contactId y body son requeridos' }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({ where: { id: contactId, workspaceId: ws.id } });
  if (!contact) return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });

  const note = await prisma.note.create({ data: { contactId, body: body.trim() } });
  return NextResponse.json({ note });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

  const note = await prisma.note.findFirst({ where: { id, contact: { workspaceId: ws.id } } });
  if (!note) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
