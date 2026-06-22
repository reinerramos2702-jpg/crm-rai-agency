// src/lib/automations/engine.ts
// Motor de ejecución de Automatización.
//
// Dos puntos de entrada:
//  - runWorkflowsForEvent(workspaceId, eventType, ctx): disparado de forma
//    SÍNCRONA desde las rutas de la API (contacts, appointments, booking)
//    cuando ocurre un evento (contact.created, contact.tag_added,
//    appointment.created, appointment.status_changed).
//  - runDueWorkflows(): disparado por el cron (/api/automations/run-due).
//    Resuelve los WorkflowRun pendientes (pasos 'delay' vencidos) y evalúa
//    los triggers basados en tiempo (appointment.upcoming, etc.)

import { prisma } from '@/lib/db';
import { evaluateCondition, matchesSyncTrigger, delayToMs } from './conditions';
import { executeAction } from './actions';
import type { AutomationContext, WorkflowRunResult, WorkflowStep, WorkflowTrigger } from './types';

const SYNC_EVENTS = ['contact.created', 'contact.tag_added', 'appointment.created', 'appointment.status_changed'];

/**
 * Punto de entrada síncrono. Llamar (sin `await` bloqueante si se prefiere
 * fire-and-forget, pero se recomienda `await` para no perder errores en
 * serverless) desde las rutas API tras crear/actualizar el registro.
 */
export async function runWorkflowsForEvent(
  workspaceId: string,
  eventType: (typeof SYNC_EVENTS)[number],
  ctx: AutomationContext & { source?: string; calendarId?: string }
): Promise<void> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (settings && settings.automationsEnabled === false) return;

    const workflows = await prisma.workflow.findMany({
      where: { workspaceId, status: 'active' },
    });

    for (const wf of workflows) {
      const trigger = wf.trigger as unknown as WorkflowTrigger;
      if (!matchesSyncTrigger(trigger, eventType, ctx)) continue;

      const steps = (wf.steps as unknown as WorkflowStep[]) || [];
      await executeWorkflowFromStep(wf.id, steps, 0, ctx, { type: eventType, payload: serializeCtx(ctx) });
    }
  } catch (err: any) {
    // Nunca dejar que un error de automatización rompa la operación principal del usuario.
    console.error(`[automations] runWorkflowsForEvent(${eventType}) error:`, err?.message || err);
  }
}

/**
 * Ejecuta los pasos de un workflow a partir de `startIndex`.
 * Si encuentra un 'delay', crea/actualiza un WorkflowRun en estado 'pending'
 * con `nextRunAt` y `resumeAtStep`, y corta la ejecución (la retoma el cron).
 */
async function executeWorkflowFromStep(
  workflowId: string,
  steps: WorkflowStep[],
  startIndex: number,
  ctx: AutomationContext,
  triggerSnapshot: { type: string; payload: any },
  existingRunId?: string
): Promise<void> {
  const result: WorkflowRunResult = existingRunId
    ? ((await prisma.workflowRun.findUnique({ where: { id: existingRunId } }))?.result as unknown as WorkflowRunResult) || { log: [] }
    : { log: [] };

  for (let i = startIndex; i < steps.length; i++) {
    const step = steps[i];

    if (step.type === 'condition') {
      const { pass, detail } = evaluateCondition(step, ctx);
      result.log.push({ step: `condición #${i + 1}`, ok: pass, detail });
      if (!pass) {
        await saveRun(workflowId, existingRunId, ctx, triggerSnapshot, 'skipped', result);
        return;
      }
      continue;
    }

    if (step.type === 'delay') {
      const ms = delayToMs(step);
      const nextRunAt = new Date(Date.now() + ms);
      result.log.push({ step: `espera #${i + 1}`, ok: true, detail: `Pausado hasta ${nextRunAt.toLocaleString('es-ES')}` });
      result.resumeAtStep = i + 1;
      await saveRun(workflowId, existingRunId, ctx, triggerSnapshot, 'pending', result, nextRunAt);
      return;
    }

    if (step.type === 'action') {
      const { ok, detail } = await executeAction(step, ctx);
      result.log.push({ step: `acción #${i + 1}`, ok, detail });
      continue;
    }
  }

  delete result.resumeAtStep;
  await saveRun(workflowId, existingRunId, ctx, triggerSnapshot, 'success', result);
  await prisma.workflow.update({
    where: { id: workflowId },
    data: { runsCount: { increment: 1 }, lastRunAt: new Date() },
  });
}

async function saveRun(
  workflowId: string,
  existingRunId: string | undefined,
  ctx: AutomationContext,
  triggerSnapshot: { type: string; payload: any },
  status: 'success' | 'error' | 'skipped' | 'pending',
  result: WorkflowRunResult,
  nextRunAt?: Date
) {
  const data = {
    status,
    contactId: ctx.contact?.id || null,
    trigger: triggerSnapshot as any,
    result: result as any,
    nextRunAt: nextRunAt || null,
  };
  if (existingRunId) {
    await prisma.workflowRun.update({ where: { id: existingRunId }, data });
  } else {
    await prisma.workflowRun.create({ data: { workflowId, ...data } });
  }
}

function serializeCtx(ctx: AutomationContext) {
  return {
    contactId: ctx.contact?.id || null,
    appointmentId: ctx.appointment?.id || null,
    tag: ctx.tag || null,
    newStatus: ctx.newStatus || null,
  };
}

// ============================================================
// CRON: runDueWorkflows
// ============================================================

const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000; // no re-disparar el mismo workflow para el mismo recurso en <6h

/** Punto de entrada del cron `/api/automations/run-due`. */
export async function runDueWorkflows(): Promise<{ resumed: number; triggered: number }> {
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
  if (settings && settings.automationsEnabled === false) {
    return { resumed: 0, triggered: 0 };
  }

  let resumed = 0;
  let triggered = 0;

  // 1) Retomar runs 'pending' cuyo nextRunAt ya venció
  const due = await prisma.workflowRun.findMany({
    where: { status: 'pending', nextRunAt: { lte: new Date() } },
    include: { workflow: true },
  });

  for (const run of due) {
    const wf = run.workflow;
    if (wf.status !== 'active') continue;
    const steps = (wf.steps as unknown as WorkflowStep[]) || [];
    const trigger = run.trigger as any;

    // Reconstruir contexto fresco desde la BD
    const ctx: AutomationContext = { workspaceId: wf.workspaceId };
    if (trigger?.payload?.contactId) {
      const c = await prisma.contact.findUnique({ where: { id: trigger.payload.contactId } });
      if (c) ctx.contact = { id: c.id, name: c.name, email: c.email, phone: c.phone, tags: c.tags };
    }
    if (trigger?.payload?.appointmentId) {
      const a = await prisma.appointment.findUnique({ where: { id: trigger.payload.appointmentId } });
      if (a) ctx.appointment = { id: a.id, status: a.status, title: a.title, startTime: a.startTime, endTime: a.endTime };
    }
    if (trigger?.payload?.tag) ctx.tag = trigger.payload.tag;
    if (trigger?.payload?.newStatus) ctx.newStatus = trigger.payload.newStatus;

    const result = (run.result as unknown as WorkflowRunResult) || { log: [] };
    const startIndex = result.resumeAtStep ?? steps.length;
    await executeWorkflowFromStep(wf.id, steps, startIndex, ctx, trigger, run.id);
    resumed++;
  }

  // 2) Evaluar workflows con triggers basados en tiempo
  const workflows = await prisma.workflow.findMany({ where: { status: 'active' } });

  for (const wf of workflows) {
    const trigger = wf.trigger as unknown as WorkflowTrigger;
    const steps = (wf.steps as unknown as WorkflowStep[]) || [];

    switch (trigger.type) {
      case 'appointment.upcoming':
        triggered += await handleAppointmentUpcoming(wf.id, wf.workspaceId, trigger, steps);
        break;
      case 'appointment.completed':
        triggered += await handleAppointmentCompleted(wf.id, wf.workspaceId, trigger, steps);
        break;
      case 'contact.inactive':
        triggered += await handleContactInactive(wf.id, wf.workspaceId, trigger, steps);
        break;
      case 'conversation.sla_overdue':
        triggered += await handleConversationSlaOverdue(wf.id, wf.workspaceId, trigger, steps, settings);
        break;
      case 'conversation.no_response':
        triggered += await handleConversationNoResponse(wf.id, wf.workspaceId, trigger, steps);
        break;
      case 'schedule.recurring':
        triggered += await handleScheduleRecurring(wf.id, wf.workspaceId, trigger, steps);
        break;
      case 'appointment.overdue':
        triggered += await handleAppointmentOverdue(wf.id, wf.workspaceId, trigger, steps);
        break;
      case 'contact.milestone':
        triggered += await handleContactMilestone(wf.id, wf.workspaceId, trigger, steps);
        break;
      default:
        break; // triggers sincrónicos: no aplican al cron
    }
  }

  return { resumed, triggered };
}

/** ¿Ya hubo un run para este workflow+contacto en la ventana de dedupe? */
async function alreadyRanRecently(workflowId: string, contactId: string | null): Promise<boolean> {
  if (!contactId) return false;
  const recent = await prisma.workflowRun.findFirst({
    where: {
      workflowId,
      contactId,
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
  });
  return !!recent;
}

// Caso: "Recordatorio de cita" — N horas antes de la cita
async function handleAppointmentUpcoming(workflowId: string, workspaceId: string, trigger: WorkflowTrigger, steps: WorkflowStep[]): Promise<number> {
  const hoursBefore = Number(trigger.config?.hoursBefore) || 24;
  const target = new Date(Date.now() + hoursBefore * 3_600_000);
  // Ventana de ±15 min alrededor del momento objetivo (frecuencia típica del cron: cada 15-60 min)
  const windowMs = 15 * 60 * 1000;
  const appts = await prisma.appointment.findMany({
    where: {
      workspaceId,
      status: 'confirmed',
      startTime: { gte: new Date(target.getTime() - windowMs), lte: new Date(target.getTime() + windowMs) },
    },
    include: { contact: true },
  });

  let count = 0;
  for (const a of appts) {
    if (!a.contact) continue;
    if (await alreadyRanRecently(workflowId, a.contactId)) continue;
    const ctx: AutomationContext = {
      workspaceId,
      contact: { id: a.contact.id, name: a.contact.name, email: a.contact.email, phone: a.contact.phone, tags: a.contact.tags },
      appointment: { id: a.id, status: a.status, title: a.title, startTime: a.startTime, endTime: a.endTime },
    };
    await executeWorkflowFromStep(workflowId, steps, 0, ctx, { type: 'appointment.upcoming', payload: serializeCtx(ctx) });
    count++;
  }
  return count;
}

// Caso: "Seguimiento post-cita" — N horas después de completarse
async function handleAppointmentCompleted(workflowId: string, workspaceId: string, trigger: WorkflowTrigger, steps: WorkflowStep[]): Promise<number> {
  const hoursAfter = Number(trigger.config?.hoursAfter) || 2;
  const target = new Date(Date.now() - hoursAfter * 3_600_000);
  const windowMs = 30 * 60 * 1000;
  const appts = await prisma.appointment.findMany({
    where: {
      workspaceId,
      status: 'completed',
      endTime: { gte: new Date(target.getTime() - windowMs), lte: new Date(target.getTime() + windowMs) },
    },
    include: { contact: true },
  });

  let count = 0;
  for (const a of appts) {
    if (!a.contact) continue;
    if (await alreadyRanRecently(workflowId, a.contactId)) continue;
    const ctx: AutomationContext = {
      workspaceId,
      contact: { id: a.contact.id, name: a.contact.name, email: a.contact.email, phone: a.contact.phone, tags: a.contact.tags },
      appointment: { id: a.id, status: a.status, title: a.title, startTime: a.startTime, endTime: a.endTime },
    };
    await executeWorkflowFromStep(workflowId, steps, 0, ctx, { type: 'appointment.completed', payload: serializeCtx(ctx) });
    count++;
  }
  return count;
}

// Caso: "Reactivación de clientes inactivos" — sin actividad en N días
async function handleContactInactive(workflowId: string, workspaceId: string, trigger: WorkflowTrigger, steps: WorkflowStep[]): Promise<number> {
  const days = Number(trigger.config?.days) || 30;
  const cutoff = new Date(Date.now() - days * 86_400_000);

  const contacts = await prisma.contact.findMany({
    where: { workspaceId, updatedAt: { lt: cutoff } },
    take: 200, // límite de seguridad por corrida
  });

  let count = 0;
  for (const c of contacts) {
    if (await alreadyRanRecently(workflowId, c.id)) continue;
    const ctx: AutomationContext = {
      workspaceId,
      contact: { id: c.id, name: c.name, email: c.email, phone: c.phone, tags: c.tags },
    };
    await executeWorkflowFromStep(workflowId, steps, 0, ctx, { type: 'contact.inactive', payload: serializeCtx(ctx) });
    count++;
  }
  return count;
}

// Caso: "Alerta de ANS atrasado" — conversación abierta sin respuesta del equipo
async function handleConversationSlaOverdue(workflowId: string, workspaceId: string, trigger: WorkflowTrigger, steps: WorkflowStep[], settings: any): Promise<number> {
  const overdueMins = Number(trigger.config?.overdueMins) || settings?.slaOverdueMins || 60;
  const cutoff = new Date(Date.now() - overdueMins * 60_000);

  const conversations = await prisma.conversation.findMany({
    where: {
      status: 'open',
      lastMessageAt: { lt: cutoff },
      contact: { workspaceId },
    },
    include: { contact: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    take: 200,
  });

  let count = 0;
  for (const conv of conversations) {
    if (!conv.contact) continue;
    const lastMsg = conv.messages[0];
    if (!lastMsg || lastMsg.direction !== 'in') continue; // ya respondió el equipo
    if (await alreadyRanRecently(workflowId, conv.contactId)) continue;

    const ctx: AutomationContext = {
      workspaceId,
      contact: { id: conv.contact.id, name: conv.contact.name, email: conv.contact.email, phone: conv.contact.phone, tags: conv.contact.tags },
      conversation: { id: conv.id, status: conv.status },
    };
    await executeWorkflowFromStep(workflowId, steps, 0, ctx, { type: 'conversation.sla_overdue', payload: serializeCtx(ctx) });
    count++;
  }
  return count;
}

// Caso: "Reenganche de conversación fría" — sin mensajes nuevos en N días
async function handleConversationNoResponse(workflowId: string, workspaceId: string, trigger: WorkflowTrigger, steps: WorkflowStep[]): Promise<number> {
  const days = Number(trigger.config?.days) || 3;
  const cutoff = new Date(Date.now() - days * 86_400_000);

  const conversations = await prisma.conversation.findMany({
    where: {
      status: { in: ['open', 'pending'] },
      lastMessageAt: { lt: cutoff, not: null },
      contact: { workspaceId },
    },
    include: { contact: true },
    take: 200,
  });

  let count = 0;
  for (const conv of conversations) {
    if (!conv.contact) continue;
    if (await alreadyRanRecently(workflowId, conv.contactId)) continue;
    const ctx: AutomationContext = {
      workspaceId,
      contact: { id: conv.contact.id, name: conv.contact.name, email: conv.contact.email, phone: conv.contact.phone, tags: conv.contact.tags },
      conversation: { id: conv.id, status: conv.status },
    };
    await executeWorkflowFromStep(workflowId, steps, 0, ctx, { type: 'conversation.no_response', payload: serializeCtx(ctx) });
    count++;
  }
  return count;
}

// Caso: "Detección de no-show" — la cita ya pasó y sigue 'confirmed'
async function handleAppointmentOverdue(workflowId: string, workspaceId: string, trigger: WorkflowTrigger, steps: WorkflowStep[]): Promise<number> {
  const graceMins = Number(trigger.config?.graceMins) || 30;
  const cutoff = new Date(Date.now() - graceMins * 60_000);

  const appts = await prisma.appointment.findMany({
    where: { workspaceId, status: 'confirmed', startTime: { lt: cutoff } },
    include: { contact: true },
    take: 200,
  });

  let count = 0;
  for (const a of appts) {
    // dedupe por cita (no por contacto): cada cita solo dispara una vez
    const recent = await prisma.workflowRun.findFirst({
      where: { workflowId, trigger: { path: ['payload', 'appointmentId'], equals: a.id } },
    });
    if (recent) continue;

    const ctx: AutomationContext = {
      workspaceId,
      contact: a.contact ? { id: a.contact.id, name: a.contact.name, email: a.contact.email, phone: a.contact.phone, tags: a.contact.tags } : null,
      appointment: { id: a.id, status: a.status, title: a.title, startTime: a.startTime, endTime: a.endTime },
    };
    await executeWorkflowFromStep(workflowId, steps, 0, ctx, { type: 'appointment.overdue', payload: serializeCtx(ctx) });
    count++;
  }
  return count;
}

// Caso: "Cliente VIP por recompra" — ≥N ejecuciones exitosas de un workflow "fuente"
// (ej: el de cross-sell post-compra) para el mismo contacto.
async function handleContactMilestone(workflowId: string, workspaceId: string, trigger: WorkflowTrigger, steps: WorkflowStep[]): Promise<number> {
  const sourceWorkflowId = trigger.config?.sourceWorkflowId as string | undefined;
  const minRuns = Number(trigger.config?.minRuns) || 3;
  if (!sourceWorkflowId) return 0;

  // Agrupar runs exitosos del workflow fuente por contacto
  const runs = await prisma.workflowRun.findMany({
    where: { workflowId: sourceWorkflowId, status: 'success', contactId: { not: null } },
    select: { contactId: true },
  });
  const counts = new Map<string, number>();
  for (const r of runs) {
    if (!r.contactId) continue;
    counts.set(r.contactId, (counts.get(r.contactId) || 0) + 1);
  }

  let count = 0;
  for (const [contactId, n] of counts.entries()) {
    if (n < minRuns) continue;
    if (await alreadyRanRecently(workflowId, contactId)) continue;
    const c = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!c || c.workspaceId !== workspaceId) continue;
    const ctx: AutomationContext = {
      workspaceId,
      contact: { id: c.id, name: c.name, email: c.email, phone: c.phone, tags: c.tags },
    };
    await executeWorkflowFromStep(workflowId, steps, 0, ctx, { type: 'contact.milestone', payload: serializeCtx(ctx) });
    count++;
  }
  return count;
}

// Caso: chequeos recurrentes genéricos sobre ContactTask (ej: pedidos pendientes de
// despacho, cobros próximos a vencer en mayoreo) — la condición/segmentación real
// vive en los `steps` (condition) del workflow, este handler solo provee candidatos.
async function handleScheduleRecurring(workflowId: string, workspaceId: string, trigger: WorkflowTrigger, steps: WorkflowStep[]): Promise<number> {
  const target = trigger.config?.target || 'contactTask'; // 'contactTask' | 'contact'

  let count = 0;

  if (target === 'contactTask') {
    const withinHours = Number(trigger.config?.dueWithinHours) || 48;
    const tasks = await prisma.contactTask.findMany({
      where: {
        done: false,
        dueAt: { lte: new Date(Date.now() + withinHours * 3_600_000), gte: new Date() },
        contact: { workspaceId },
      },
      include: { contact: true },
      take: 200,
    });

    for (const t of tasks) {
      if (!t.contact) continue;
      if (await alreadyRanRecently(workflowId, t.contactId)) continue;
      const ctx: AutomationContext = {
        workspaceId,
        contact: { id: t.contact.id, name: t.contact.name, email: t.contact.email, phone: t.contact.phone, tags: t.contact.tags },
      };
      await executeWorkflowFromStep(workflowId, steps, 0, ctx, { type: 'schedule.recurring', payload: serializeCtx(ctx) });
      count++;
    }
  } else {
    // target === 'contact': recorre todos los contactos del workspace y deja que
    // los pasos 'condition' filtren (ej: tag_includes / tag_not_includes)
    const contacts = await prisma.contact.findMany({ where: { workspaceId }, take: 200 });
    for (const c of contacts) {
      if (await alreadyRanRecently(workflowId, c.id)) continue;
      const ctx: AutomationContext = {
        workspaceId,
        contact: { id: c.id, name: c.name, email: c.email, phone: c.phone, tags: c.tags },
      };
      await executeWorkflowFromStep(workflowId, steps, 0, ctx, { type: 'schedule.recurring', payload: serializeCtx(ctx) });
      count++;
    }
  }

  return count;
}
