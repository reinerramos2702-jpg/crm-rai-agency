import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getOrCreateWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { MANUAL_LAUNCHPAD_ITEM_IDS, isManualLaunchpadItemId } from '@/lib/launchpad-items';

export const runtime = 'nodejs';

/**
 * GET  /api/launchpad          — progreso real de la Guía de Inicio para el workspace actual
 * POST /api/launchpad  body:{itemId, done} — marca/desmarca un ítem MANUAL (los automáticos se rechazan)
 *
 * Antes, /launchpad calculaba el progreso 100% en localStorage del navegador
 * (nunca contra la base de datos), por eso siempre arrancaba en 0/22 · 0% sin
 * importar la actividad real del workspace. Ver diagnóstico completo en el
 * plan de esta rama.
 *
 * De los 22 ítems del checklist, 13 tienen una condición verificable en la
 * base de datos (AUTO_ITEM_IDS más abajo) y se calculan en vivo por
 * workspaceId. Los 9 restantes no tienen un modelo de datos que los respalde
 * hoy (embudo de captación/formularios, anuncios de Meta, redes sociales,
 * e-commerce, etc.) y siguen siendo un toggle manual — pero ahora persistido
 * en Workspace.launchpadManual, no en localStorage, así que no se "resetea"
 * al cambiar de navegador/dispositivo.
 */

async function computeAutoCompleted(workspaceId: string): Promise<string[]> {
  const [
    contactCount,
    campaignCount,
    multichannelConvCount,
    salesConvCount,
    messengerConvCount,
    activeWorkflowCount,
    anyWorkflowCount,
    bookingEnabledCalendarCount,
    appointmentCount,
    paymentCount,
    memberCount,
    settings,
    eventWorkflows,
  ] = await Promise.all([
    prisma.contact.count({ where: { workspaceId } }),
    prisma.campaign.count({ where: { workspaceId } }),
    prisma.conversation.count({ where: { contact: { workspaceId }, channel: { not: 'manual' } } }),
    prisma.conversation.count({ where: { contact: { workspaceId } } }),
    prisma.conversation.count({ where: { contact: { workspaceId }, channel: 'instagram' } }),
    prisma.workflow.count({ where: { workspaceId, status: 'active' } }),
    prisma.workflow.count({ where: { workspaceId } }),
    prisma.calendarResource.count({ where: { workspaceId, bookingEnabled: true } }),
    prisma.appointment.count({ where: { workspaceId } }),
    prisma.payment.count({ where: { workspaceId } }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.settings.findUnique({ where: { workspaceId } }),
    prisma.workflow.findMany({ where: { workspaceId, status: 'active' }, select: { trigger: true } }),
  ]);

  const EVENT_TRIGGER_TYPES = ['contact.created', 'contact.tag_added', 'appointment.created', 'appointment.status_changed'];
  const hasEventTrigger = eventWorkflows.some((wf) => EVENT_TRIGGER_TYPES.includes((wf.trigger as any)?.type));

  const completed: string[] = [];
  if (contactCount >= 1) completed.push('crear-contacto');
  if (contactCount >= 2) completed.push('importar-contactos'); // heurística: más de un contacto sugiere carga masiva
  if (multichannelConvCount >= 1) completed.push('comunicacion-multicanal');
  if (campaignCount >= 1) completed.push('primera-campana');
  if (activeWorkflowCount >= 1) completed.push('seguimiento-automatizado');
  if (bookingEnabledCalendarCount >= 1 || appointmentCount >= 1) completed.push('programacion-citas');
  if (salesConvCount >= 1) completed.push('conversaciones-ventas');
  if (messengerConvCount >= 1) completed.push('messenger'); // solo Instagram está modelado hoy (sin canal 'facebook' propio)
  if (paymentCount >= 1) completed.push('facturas');
  if (anyWorkflowCount >= 1) completed.push('primera-automatizacion');
  if (hasEventTrigger) completed.push('disparadores-eventos');
  if (memberCount >= 1) completed.push('roles-equipo');
  if (settings?.n8nWebhookUrl) completed.push('notificaciones-multicanal');

  return completed;
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspace = await getOrCreateWorkspace(auth.userId);
  const [autoCompleted, ws] = await Promise.all([
    computeAutoCompleted(workspace.id),
    prisma.workspace.findUnique({ where: { id: workspace.id }, select: { launchpadManual: true } }),
  ]);

  const manual = (ws?.launchpadManual as Record<string, boolean>) || {};
  const manualCompleted = MANUAL_LAUNCHPAD_ITEM_IDS.filter((id) => manual[id] === true);

  return NextResponse.json({ completed: [...autoCompleted, ...manualCompleted], manualItemIds: MANUAL_LAUNCHPAD_ITEM_IDS });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { itemId, done } = await req.json();
  if (typeof itemId !== 'string' || !isManualLaunchpadItemId(itemId)) {
    return NextResponse.json(
      { error: 'Este ítem se completa automáticamente según la actividad del workspace — no se puede marcar a mano.' },
      { status: 400 }
    );
  }

  const workspace = await getOrCreateWorkspace(auth.userId);
  const current = await prisma.workspace.findUnique({ where: { id: workspace.id }, select: { launchpadManual: true } });
  const manual = { ...((current?.launchpadManual as Record<string, boolean>) || {}), [itemId]: !!done };

  await prisma.workspace.update({ where: { id: workspace.id }, data: { launchpadManual: manual } });
  return NextResponse.json({ ok: true });
}
