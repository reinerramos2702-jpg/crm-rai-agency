import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * PATCH /api/conversations/[id]  body: { status?, unreadCount? }
 * Usado para marcar como leída (unreadCount: 0) o cambiar status (open|pending|closed).
 */

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;
  const { id } = await params;

  const conv = await prisma.conversation.findFirst({ where: { id, contact: { workspaceId: ws.id } } });
  if (!conv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { status, unreadCount } = await req.json();

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(unreadCount !== undefined ? { unreadCount } : {}),
    },
  });

  return NextResponse.json({ conversation: updated });
}
