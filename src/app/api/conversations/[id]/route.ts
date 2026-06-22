import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';

/**
 * PATCH /api/conversations/[id]  body: { status?, unreadCount? }
 * Usado para marcar como leída (unreadCount: 0) o cambiar status (open|pending|closed).
 */

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ws = await getOrCreateWorkspace(auth.userId);
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
