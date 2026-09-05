import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRoleContext, isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/settings — leer configuración del workspace del usuario autenticado
 * POST /api/settings — guardar configuración del workspace del usuario autenticado
 *
 * Bloque 1: Settings dejó de ser un singleton global (`id='global'` compartido
 * por todos los tenants — ver auditoría Bloque 0.5) y pasó a estar scopeado
 * por `workspaceId`. Nunca volver a leer/escribir por `id: 'global'` aquí.
 */

export async function GET(req: NextRequest) {
  const ctx = await getRoleContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.settings.findUnique({ where: { workspaceId: ctx.workspace.id } });
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  const {
    n8nWebhookUrl,
    igBusinessId,
    slaFirstResponseMins,
    slaOverdueMins,
    aiCountsAsResponse,
    calendarHideEventDetails,
    automationsEnabled,
    automationNotifyEmail,
  } = await req.json();

  const data = {
    ...(n8nWebhookUrl !== undefined ? { n8nWebhookUrl } : {}),
    ...(igBusinessId !== undefined ? { igBusinessId } : {}),
    ...(slaFirstResponseMins !== undefined ? { slaFirstResponseMins } : {}),
    ...(slaOverdueMins !== undefined ? { slaOverdueMins } : {}),
    ...(aiCountsAsResponse !== undefined ? { aiCountsAsResponse } : {}),
    ...(calendarHideEventDetails !== undefined ? { calendarHideEventDetails } : {}),
    ...(automationsEnabled !== undefined ? { automationsEnabled } : {}),
    ...(automationNotifyEmail !== undefined ? { automationNotifyEmail } : {}),
  };

  const settings = await prisma.settings.upsert({
    where: { workspaceId: ctx.workspace.id },
    create: { workspaceId: ctx.workspace.id, ...data },
    update: data,
  });

  return NextResponse.json({ settings });
}
