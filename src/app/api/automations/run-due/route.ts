import { NextRequest, NextResponse } from 'next/server';
import { runDueWorkflows } from '@/lib/automations/engine';

export const runtime = 'nodejs';

/**
 * GET /api/automations/run-due
 *
 * Endpoint del cron (Vercel Cron, ver vercel.json: cada 15 min). Retoma los
 * WorkflowRun 'pending' cuyo nextRunAt venció (pasos 'delay') y evalúa los
 * triggers basados en tiempo (appointment.upcoming, appointment.completed,
 * appointment.overdue, contact.inactive, conversation.sla_overdue,
 * conversation.no_response, schedule.recurring, contact.milestone).
 *
 * Seguridad: requiere header `Authorization: Bearer <CRON_SECRET>` cuando
 * la variable de entorno CRON_SECRET está configurada (Vercel Cron la añade
 * automáticamente a las invocaciones programadas).
 *
 * NOTA (plan Hobby de Vercel): los cron jobs en el plan gratuito se ejecutan
 * como máximo 1 vez/día, sin importar el `schedule` configurado. Para la
 * cadencia de 15 min indicada aquí se requiere plan Pro o superior. Mientras
 * tanto, este endpoint puede invocarse manualmente o desde un cron externo
 * (ej. cron-job.org) apuntando a esta URL con el mismo header de autorización.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await runDueWorkflows();
  return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
}
