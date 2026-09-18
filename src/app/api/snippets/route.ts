import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET    /api/snippets — lista fragmentos del workspace
 * POST   /api/snippets  body: { title, body }
 * DELETE /api/snippets?id=...
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'staff', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const snippets = await prisma.snippet.findMany({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ snippets });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const { title, body } = await req.json();
  if (!title || !title.trim() || !body || !body.trim()) {
    return NextResponse.json({ error: 'title y body son requeridos' }, { status: 400 });
  }

  const snippet = await prisma.snippet.create({
    data: { workspaceId: ws.id, title: title.trim(), body: body.trim() },
  });
  return NextResponse.json({ snippet });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

  const existing = await prisma.snippet.findFirst({ where: { id, workspaceId: ws.id } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.snippet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
