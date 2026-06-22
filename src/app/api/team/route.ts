import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ROLES, isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/team — lista el owner + miembros del workspace (solo admin).
 * POST /api/team — invita a un nuevo miembro por email con un rol asignado (solo admin).
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin']);
  if (!isRoleContext(ctx)) return ctx;

  const owner = await prisma.user.findUnique({ where: { id: ctx.workspace.ownerId } });

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    owner: owner
      ? { id: owner.id, email: owner.email, displayName: owner.displayName }
      : null,
    members: members.map((m) => ({
      id: m.id,
      email: m.email,
      role: m.role,
      status: m.status,
      displayName: m.user?.displayName ?? null,
      createdAt: m.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin']);
  if (!isRoleContext(ctx)) return ctx;

  const { email, role } = await req.json();

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }
  if (!role || !(ROLES as string[]).includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }
  if (role === 'admin') {
    return NextResponse.json(
      { error: 'No se puede invitar a alguien directamente como administrador.' },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === ctx.auth.email.toLowerCase()) {
    return NextResponse.json({ error: 'Ya eres el administrador de este workspace.' }, { status: 400 });
  }

  // Si ya existe un usuario del CRM con ese email, vincúlalo de una vez.
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  const member = await prisma.workspaceMember.upsert({
    where: { workspaceId_email: { workspaceId: ctx.workspace.id, email: normalizedEmail } },
    update: { role, status: existingUser ? 'active' : 'invited', userId: existingUser?.id ?? null },
    create: {
      workspaceId: ctx.workspace.id,
      email: normalizedEmail,
      role,
      status: existingUser ? 'active' : 'invited',
      userId: existingUser?.id ?? null,
    },
  });

  return NextResponse.json({ member });
}
