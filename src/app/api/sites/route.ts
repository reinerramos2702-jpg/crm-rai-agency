import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const status = url.searchParams.get('status') || '';

  const where: Record<string, unknown> = { workspaceId: ctx.workspace.id };
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
    ];
  }

  const sites = await prisma.site.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { rooms: true, bookings: true, payments: true } },
    },
  });

  return NextResponse.json(
    { sites },
    { headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=30' } }
  );
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });

  // Slug único — si choca, sufijo aleatorio
  const base = slugify(name);
  let slug = base || `sede-${Date.now()}`;
  const exists = await prisma.site.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const site = await prisma.site.create({
    data: {
      workspaceId: ctx.workspace.id,
      name,
      slug,
      type: body.type ? String(body.type) : 'hotel',
      address: body.address ? String(body.address) : null,
      city: body.city ? String(body.city) : null,
      country: body.country ? String(body.country) : null,
      postalCode: body.postalCode ? String(body.postalCode) : null,
      latitude: typeof body.latitude === 'number' ? body.latitude : null,
      longitude: typeof body.longitude === 'number' ? body.longitude : null,
      contactName: body.contactName ? String(body.contactName) : null,
      contactPhone: body.contactPhone ? String(body.contactPhone) : null,
      contactEmail: body.contactEmail ? String(body.contactEmail) : null,
      capacity: typeof body.capacity === 'number' ? body.capacity : 0,
      status: body.status ? String(body.status) : 'active',
      notes: body.notes ? String(body.notes) : null,
    },
  });

  await logAudit({
    workspaceId: ctx.workspace.id,
    userId: ctx.auth.userId,
    action: 'site.created',
    entityType: 'site',
    entityId: site.id,
    meta: { name: site.name },
  });

  return NextResponse.json({ site }, { status: 201 });
}
