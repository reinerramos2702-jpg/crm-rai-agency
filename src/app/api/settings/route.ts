import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/settings — leer configuración global
 * POST /api/settings — guardar configuración global
 */

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
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
    where: { id: 'global' },
    create: { id: 'global', ...data },
    update: data,
  });

  return NextResponse.json({ settings });
}
