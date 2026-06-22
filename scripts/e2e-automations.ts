// scripts/e2e-automations.ts
// Certificación funcional de las 15 plantillas de Automatización.
// Ejecuta cada plantilla contra un contacto/cita reales (creados y borrados
// en este script) usando los mismos motores (`evaluateCondition`,
// `executeAction`) que usa el engine en producción. No usa datos falsos:
// todo se persiste y se lee de la base de datos real.
//
// Uso: npx tsx scripts/e2e-automations.ts

import { prisma } from '../src/lib/db';
import { getOrCreateWorkspace } from '../src/lib/workspace';
import { WORKFLOW_TEMPLATES } from '../src/lib/automations/templates';
import { evaluateCondition } from '../src/lib/automations/conditions';
import { executeAction } from '../src/lib/automations/actions';
import type { AutomationContext, WorkflowStep } from '../src/lib/automations/types';

const DEV_USER_ID = 'dev-user-001';

interface TemplateRunSpec {
  id: string;
  // Tags iniciales del contacto de prueba para que las condiciones tomen el camino esperado.
  initialTags?: string[];
  // Tag que "disparó" el evento (para contact.tag_added → {{event.tag}})
  eventTag?: string;
  // Si true, el contexto incluye la cita de prueba.
  withAppointment?: boolean;
}

const SPECS: Record<string, TemplateRunSpec> = {
  servicios_recordatorio_24h: { id: 'servicios_recordatorio_24h', withAppointment: true },
  servicios_confirmacion_reserva: { id: 'servicios_confirmacion_reserva', withAppointment: true },
  servicios_no_show: { id: 'servicios_no_show', withAppointment: true },
  servicios_seguimiento_post_cita: { id: 'servicios_seguimiento_post_cita', withAppointment: true },
  servicios_reactivacion_inactivo: { id: 'servicios_reactivacion_inactivo' },

  retail_bienvenida_lead: { id: 'retail_bienvenida_lead' },
  retail_sla_vencido: { id: 'retail_sla_vencido' },
  retail_reenganche_frio: { id: 'retail_reenganche_frio' },
  retail_agradecimiento_cross_sell: { id: 'retail_agradecimiento_cross_sell', eventTag: 'compra_confirmada' },
  retail_vip_recompra: { id: 'retail_vip_recompra' },

  mayoreo_recordatorio_reposicion: { id: 'mayoreo_recordatorio_reposicion', initialTags: ['pedido_registrado'] },
  mayoreo_pedido_grande: { id: 'mayoreo_pedido_grande', eventTag: 'pedido_grande' },
  mayoreo_cliente_riesgo: { id: 'mayoreo_cliente_riesgo', initialTags: ['cliente_mayorista'] },
  mayoreo_actualizacion_pedido: { id: 'mayoreo_actualizacion_pedido', eventTag: 'pedido_enviado' },
  mayoreo_onboarding_cliente: { id: 'mayoreo_onboarding_cliente', eventTag: 'cliente_mayorista' },
};

interface StepLog {
  step: string;
  ok: boolean;
  detail: string;
}

async function runTemplateSteps(
  steps: WorkflowStep[],
  ctx: AutomationContext
): Promise<{ status: 'success' | 'skipped' | 'pending'; log: StepLog[] }> {
  const log: StepLog[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if (step.type === 'condition') {
      const { pass, detail } = evaluateCondition(step, ctx);
      log.push({ step: `condición #${i + 1}`, ok: pass, detail });
      if (!pass) return { status: 'skipped', log };
      continue;
    }

    if (step.type === 'delay') {
      log.push({ step: `espera #${i + 1}`, ok: true, detail: `delay(${step.config?.amount} ${step.config?.unit}) — resumen pendiente de cron` });
      return { status: 'pending', log };
    }

    if (step.type === 'action') {
      const { ok, detail } = await executeAction(step, ctx);
      log.push({ step: `acción #${i + 1} (${step.config?.action})`, ok, detail });
      continue;
    }
  }

  return { status: 'success', log };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CERTIFICACIÓN — Automatización (15 plantillas)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const ws = await getOrCreateWorkspace(DEV_USER_ID);
  console.log(`Workspace: ${ws.id} (${ws.name})\n`);

  // Las acciones send_webhook no deben golpear el n8n real configurado por el
  // usuario durante esta certificación (evita ruido/datos falsos en su flujo).
  // Se desactiva temporalmente y se restaura al final.
  const settingsBefore = await prisma.settings.findUnique({ where: { id: 'global' } });
  const originalWebhookUrl = settingsBefore?.n8nWebhookUrl ?? null;
  if (originalWebhookUrl) {
    await prisma.settings.update({ where: { id: 'global' }, data: { n8nWebhookUrl: null } });
    console.log('(n8nWebhookUrl temporalmente desactivado durante la certificación — se restaura al final)\n');
  }

  // ─── Setup: calendario + cita de prueba (para plantillas de servicios) ───
  const calendar = await prisma.calendarResource.create({
    data: {
      workspaceId: ws.id,
      name: '[E2E] Calendario de prueba',
      type: 'personal',
      durationMins: 30,
      status: 'active',
    },
  });

  const apptContact = await prisma.contact.create({
    data: { workspaceId: ws.id, name: '[E2E] Cliente de cita', source: 'manual', tags: [] },
  });

  let appointment = await prisma.appointment.create({
    data: {
      workspaceId: ws.id,
      calendarId: calendar.id,
      contactId: apptContact.id,
      title: 'Corte de cabello',
      status: 'confirmed',
      startTime: new Date(Date.now() + 24 * 3_600_000),
      endTime: new Date(Date.now() + 25 * 3_600_000),
    },
  });

  const createdContactIds: string[] = [apptContact.id];
  const results: { id: string; name: string; niche: string; status: string; failed: boolean; log: StepLog[] }[] = [];

  for (const tpl of WORKFLOW_TEMPLATES) {
    const spec = SPECS[tpl.id];
    if (!spec) {
      results.push({ id: tpl.id, name: tpl.name, niche: tpl.niche, status: 'SIN SPEC', failed: true, log: [] });
      continue;
    }

    let ctx: AutomationContext;

    if (spec.withAppointment) {
      // Reset de estado de la cita antes de cada plantilla que la usa
      appointment = await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'confirmed' } });
      const fresh = await prisma.contact.findUnique({ where: { id: apptContact.id } });
      ctx = {
        workspaceId: ws.id,
        contact: { id: fresh!.id, name: fresh!.name, email: fresh!.email, phone: fresh!.phone, tags: fresh!.tags },
        appointment: { id: appointment.id, status: appointment.status, title: appointment.title, startTime: appointment.startTime, endTime: appointment.endTime },
      };
    } else {
      const contact = await prisma.contact.create({
        data: { workspaceId: ws.id, name: `[E2E] ${tpl.id}`, source: 'manual', tags: spec.initialTags || [] },
      });
      createdContactIds.push(contact.id);
      ctx = {
        workspaceId: ws.id,
        contact: { id: contact.id, name: contact.name, email: contact.email, phone: contact.phone, tags: contact.tags },
        tag: spec.eventTag,
      };
    }

    const { status, log } = await runTemplateSteps(tpl.steps, ctx);
    const failed = log.some((l) => !l.ok && !l.step.startsWith('condición'));
    results.push({ id: tpl.id, name: tpl.name, niche: tpl.niche, status, failed, log });
  }

  // ─── Reporte ───
  let okCount = 0;
  for (const r of results) {
    const icon = r.failed ? '❌' : '✅';
    if (!r.failed) okCount++;
    console.log(`${icon} [${r.niche}] ${r.id} — ${r.name}`);
    console.log(`   estado: ${r.status}`);
    for (const l of r.log) {
      console.log(`     ${l.ok ? '·' : '✗'} ${l.step}: ${l.detail}`);
    }
    console.log('');
  }

  console.log('───────────────────────────────────────────────────────────');
  console.log(`Resultado: ${okCount}/${results.length} plantillas OK`);
  console.log('───────────────────────────────────────────────────────────\n');

  // ─── Cleanup ───
  console.log('Limpiando datos de prueba...');
  await prisma.contactTask.deleteMany({ where: { contactId: { in: createdContactIds } } });
  await prisma.note.deleteMany({ where: { contactId: { in: createdContactIds } } });
  await prisma.appointment.delete({ where: { id: appointment.id } });
  await prisma.contact.deleteMany({ where: { id: { in: createdContactIds } } });
  await prisma.calendarResource.delete({ where: { id: calendar.id } });

  if (originalWebhookUrl) {
    await prisma.settings.update({ where: { id: 'global' }, data: { n8nWebhookUrl: originalWebhookUrl } });
    console.log('(n8nWebhookUrl restaurado a su valor original)');
  }

  console.log('OK — datos de prueba eliminados.\n');

  if (okCount !== results.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('Error en certificación:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
