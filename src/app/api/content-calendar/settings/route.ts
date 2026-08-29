import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';
import { getSettings, settingsToDTO, logPostEvent } from '@/lib/content-calendar/service';
import { isValidTimezone } from '@/lib/content-calendar/timezone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/content-calendar/settings → configuración del calendario del workspace
 * PATCH /api/content-calendar/settings → actualiza zona horaria, límites, marca y onboarding
 *
 * Cubre: #13/#14 (reglas de negocio), #18 (paleta de marca del cliente),
 * #20 (marcar el recorrido guiado como completado) y la zona horaria por
 * defecto del producto (America/Caracas).
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const settings = await getSettings(ctx.workspace.id);
  return NextResponse.json({ settings: settingsToDTO(settings), role: ctx.role });
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function PATCH(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  await getSettings(ctx.workspace.id);
  const data: Record<string, unknown> = {};

  if (typeof body.timezone === 'string') {
    if (!isValidTimezone(body.timezone)) {
      return NextResponse.json(
        { error: `Zona horaria no reconocida: ${body.timezone}` },
        { status: 400 }
      );
    }
    data.timezone = body.timezone;
  }

  if (body.maxPostsPerDay !== undefined) {
    const n = Number(body.maxPostsPerDay);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      return NextResponse.json(
        { error: 'El límite de publicaciones por día debe ser un entero entre 1 y 20.' },
        { status: 400 }
      );
    }
    data.maxPostsPerDay = n;
  }

  if (body.requireApproval !== undefined) data.requireApproval = Boolean(body.requireApproval);

  if (typeof body.defaultPostTime === 'string') {
    if (!HHMM.test(body.defaultPostTime)) {
      return NextResponse.json({ error: 'La hora debe tener formato HH:mm.' }, { status: 400 });
    }
    data.defaultPostTime = body.defaultPostTime;
  }

  for (const field of ['brandPrimary', 'brandAccent', 'brandBackground'] as const) {
    if (body[field] !== undefined) {
      const v = body[field];
      if (v === null || v === '') {
        data[field] = null;
      } else if (typeof v === 'string' && HEX.test(v)) {
        data[field] = v;
      } else {
        return NextResponse.json(
          { error: `${field} debe ser un color hex tipo #C9A84C.` },
          { status: 400 }
        );
      }
    }
  }

  for (const field of ['brandName', 'brandHandle', 'brandAvatarUrl'] as const) {
    if (body[field] !== undefined) {
      const v = body[field];
      data[field] = v === null || v === '' ? null : String(v).slice(0, 200);
    }
  }

  if (body.onboardingCompleted !== undefined) {
    data.onboardingCompletedAt = body.onboardingCompleted ? new Date() : null;
  }

  const updated = await prisma.contentCalendarSettings.update({
    where: { workspaceId: ctx.workspace.id },
    data,
  });

  await logPostEvent({
    workspaceId: ctx.workspace.id,
    actorUserId: ctx.auth.userId,
    action: 'settings_updated',
    detail: `Campos actualizados: ${Object.keys(data).join(', ') || 'ninguno'}`,
  });

  return NextResponse.json({ settings: settingsToDTO(updated) });
}
