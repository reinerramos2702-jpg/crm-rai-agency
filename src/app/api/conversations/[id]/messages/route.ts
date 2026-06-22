import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';

/**
 * GET  /api/conversations/[id]/messages — historial de mensajes
 * POST /api/conversations/[id]/messages  body: { body, sender? }
 *      sender: 'agent' (default, equipo) | 'ai' | 'contact' (simula respuesta entrante)
 *      Marca lastMessageAt y, si sender='contact', incrementa unreadCount.
 */

async function assertOwnership(workspaceId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, contact: { workspaceId } },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ws = await getOrCreateWorkspace(auth.userId);
  const conv = await assertOwnership(ws.id, id);
  if (!conv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const ws = await getOrCreateWorkspace(auth.userId);
  const conv = await assertOwnership(ws.id, id);
  if (!conv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { body, sender } = await req.json();
  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'body es requerido' }, { status: 400 });
  }

  const senderValue = sender === 'contact' ? 'contact' : sender === 'ai' ? 'ai' : 'agent';
  const direction = senderValue === 'contact' ? 'in' : 'out';

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      direction,
      sender: senderValue,
      body: body.trim(),
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: {
      lastMessageAt: message.createdAt,
      ...(direction === 'in' ? { unreadCount: { increment: 1 } } : { unreadCount: 0 }),
      status: 'open',
    },
  });

  return NextResponse.json({ message });
}
