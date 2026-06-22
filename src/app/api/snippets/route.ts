import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';

/**
 * GET    /api/snippets — lista fragmentos del workspace
 * POST   /api/snippets  body: { title, body }
 * DELETE /api/snippets?id=...
 */

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ws = await getOrCreateWorkspace(auth.userId);
  const snippets = await prisma.snippet.findMany({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ snippets });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, body } = await req.json();
  if (!title || !title.trim() || !body || !body.trim()) {
    return NextResponse.json({ error: 'title y body son requeridos' }, { status: 400 });
  }

  const ws = await getOrCreateWorkspace(auth.userId);
  const snippet = await prisma.snippet.create({
    data: { workspaceId: ws.id, title: title.trim(), body: body.trim() },
  });
  return NextResponse.json({ snippet });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

  const ws = await getOrCreateWorkspace(auth.userId);
  const existing = await prisma.snippet.findFirst({ where: { id, workspaceId: ws.id } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.snippet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
