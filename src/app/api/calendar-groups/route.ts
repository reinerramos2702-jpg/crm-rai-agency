import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';

/**
 * GET    /api/calendar-groups — lista grupos del workspace (con sus calendarios)
 * POST   /api/calendar-groups  body: { name, description?, template?, slug? }
 * DELETE /api/calendar-groups?id=...
 */

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ws = await getOrCreateWorkspace(auth.userId);
  const groups = await prisma.calendarGroup.findMany({
    where: { workspaceId: ws.id },
    include: { calendars: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, template, slug } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }

  const ws = await getOrCreateWorkspace(auth.userId);

  let finalSlug = slugify(slug || name);
  if (!finalSlug) finalSlug = `grupo-${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.calendarGroup.findUnique({ where: { slug: finalSlug } });
    if (!exists) break;
    finalSlug = `${finalSlug}-${Math.random().toString(36).slice(2, 5)}`;
  }

  const group = await prisma.calendarGroup.create({
    data: {
      workspaceId: ws.id,
      name: name.trim(),
      description: description?.trim() || null,
      template: template || 'neo',
      slug: finalSlug,
    },
    include: { calendars: true },
  });
  return NextResponse.json({ group });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

  const ws = await getOrCreateWorkspace(auth.userId);
  const existing = await prisma.calendarGroup.findFirst({ where: { id, workspaceId: ws.id } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  // Los calendarios del grupo quedan sin agrupar (no se eliminan)
  await prisma.$transaction([
    prisma.calendarResource.updateMany({ where: { groupId: id }, data: { groupId: null } }),
    prisma.calendarGroup.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
