import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';

/**
 * GET    /api/activation-links — lista enlaces del workspace
 * POST   /api/activation-links  body: { label, destination, slug? }
 *        Si slug no se provee, se genera automáticamente.
 *        El enlace público queda disponible en /go/[slug] y redirige
 *        a `destination` contando el click.
 * DELETE /api/activation-links?id=...
 */

function randomSlug() {
  return Math.random().toString(36).slice(2, 8);
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ws = await getOrCreateWorkspace(auth.userId);
  const links = await prisma.activationLink.findMany({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { label, destination, slug } = await req.json();
  if (!label || !label.trim() || !destination || !destination.trim()) {
    return NextResponse.json({ error: 'label y destination son requeridos' }, { status: 400 });
  }

  const ws = await getOrCreateWorkspace(auth.userId);

  let finalSlug = (slug || randomSlug()).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  // Garantizar unicidad
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.activationLink.findUnique({ where: { slug: finalSlug } });
    if (!exists) break;
    finalSlug = `${finalSlug}-${randomSlug().slice(0, 3)}`;
  }

  const link = await prisma.activationLink.create({
    data: { workspaceId: ws.id, label: label.trim(), destination: destination.trim(), slug: finalSlug },
  });
  return NextResponse.json({ link });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

  const ws = await getOrCreateWorkspace(auth.userId);
  const existing = await prisma.activationLink.findFirst({ where: { id, workspaceId: ws.id } });
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.activationLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
