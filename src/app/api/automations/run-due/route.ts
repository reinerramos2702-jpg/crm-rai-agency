import { NextRequest, NextResponse } from 'next/server';
import { runDueWorkflows } from '@/lib/automations/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/automations/run-due
 *
 * Endpoint del cron (Vercel Cron, ver vercel.json: cada 15 min). Retoma los
 * WorkflowRun 'pending' cuyo nextRunAt venció (pasos 'delay') y evalúa los
 * triggers basados en tiempo (appointment.upcoming, appointment.completed,
 * appointment.overdue, contact.inactive, conversation.sla_overdue,
 * conversation.no_response, schedule.recurring, contact.milestone).
 *
 * Seguridad: requiere que CRON_SECRET esté configurado y que el header sea
 * `Authorization: Bearer <CRON_SECRET>` (Vercel Cron lo añade automáticamente
 * a las invocaciones programadas).
 *
 * NOTA (plan Hobby de Vercel): los cron jobs en el plan gratuito se ejecutan
 * como máximo 1 vez/día, sin importar el `schedule` configurado. Para la
 * cadencia de 15 min indicada aquí se requiere plan Pro o superior. Mientras
 * tanto, este endpoint puede invocarse manualmente o desde un cron externo
 * (ej. cron-job.org) apuntando a esta URL con el mismo header de autorización.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runDueWorkflows();
  return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
}
