// src/lib/automations/actions.ts
// Ejecutores de acciones de un Workflow. Cada acción recibe el contexto
// (mutable) y su config, y devuelve { ok, detail } para el log de WorkflowRun.

import { prisma } from '@/lib/db';
import type { AutomationContext, WorkflowStep } from './types';

interface ActionResult {
  ok: boolean;
  detail: string;
}

export async function executeAction(step: WorkflowStep, ctx: AutomationContext): Promise<ActionResult> {
  const cfg = step.config || {};
  const action = cfg.action as string;

  switch (action) {
    case 'add_tag':
      return addTag(ctx, cfg);
    case 'remove_tag':
      return removeTag(ctx, cfg);
    case 'create_task':
      return createTask(ctx, cfg);
    case 'create_note':
      return createNote(ctx, cfg);
    case 'update_appointment_status':
      return updateAppointmentStatus(ctx, cfg);
    case 'send_webhook':
      return sendWebhook(ctx, cfg);
    default:
      return { ok: false, detail: `Acción desconocida: ${action}` };
  }
}

// Reemplaza placeholders {{contact.name}}, {{appointment.title}}, etc. en strings
function fillTemplate(text: string, ctx: AutomationContext): string {
  return text
    .replace(/\{\{\s*contact\.name\s*\}\}/g, ctx.contact?.name || 'Cliente')
    .replace(/\{\{\s*contact\.email\s*\}\}/g, ctx.contact?.email || '')
    .replace(/\{\{\s*contact\.phone\s*\}\}/g, ctx.contact?.phone || '')
    .replace(/\{\{\s*appointment\.title\s*\}\}/g, ctx.appointment?.title || '')
    .replace(/\{\{\s*appointment\.startTime\s*\}\}/g, ctx.appointment?.startTime ? new Date(ctx.appointment.startTime).toLocaleString('es-ES') : '')
    .replace(/\{\{\s*event\.tag\s*\}\}/g, ctx.tag || '');
}

async function addTag(ctx: AutomationContext, cfg: any): Promise<ActionResult> {
  if (!ctx.contact || !cfg.tag) return { ok: false, detail: 'add_tag: sin contacto o sin tag configurado' };
  const tags = ctx.contact.tags || [];
  if (tags.includes(cfg.tag)) {
    return { ok: true, detail: `add_tag: "${cfg.tag}" ya estaba presente` };
  }
  const updated = [...tags, cfg.tag];
  await prisma.contact.update({ where: { id: ctx.contact.id }, data: { tags: updated } });
  ctx.contact.tags = updated; // mutar contexto para pasos siguientes
  return { ok: true, detail: `add_tag: agregado "${cfg.tag}"` };
}

async function removeTag(ctx: AutomationContext, cfg: any): Promise<ActionResult> {
  if (!ctx.contact || !cfg.tag) return { ok: false, detail: 'remove_tag: sin contacto o sin tag configurado' };
  const tags = ctx.contact.tags || [];
  if (!tags.includes(cfg.tag)) {
    return { ok: true, detail: `remove_tag: "${cfg.tag}" no estaba presente` };
  }
  const updated = tags.filter((t) => t !== cfg.tag);
  await prisma.contact.update({ where: { id: ctx.contact.id }, data: { tags: updated } });
  ctx.contact.tags = updated;
  return { ok: true, detail: `remove_tag: quitado "${cfg.tag}"` };
}

async function createTask(ctx: AutomationContext, cfg: any): Promise<ActionResult> {
  if (!ctx.contact) return { ok: false, detail: 'create_task: sin contacto' };
  const title = fillTemplate(cfg.title || 'Tarea generada por automatización', ctx);
  let dueAt: Date | undefined;
  if (cfg.dueInHours) {
    dueAt = new Date(Date.now() + Number(cfg.dueInHours) * 3_600_000);
  }
  await prisma.contactTask.create({
    data: { contactId: ctx.contact.id, title, dueAt },
  });
  return { ok: true, detail: `create_task: "${title}"${dueAt ? ` (vence ${dueAt.toLocaleString('es-ES')})` : ''}` };
}

async function createNote(ctx: AutomationContext, cfg: any): Promise<ActionResult> {
  if (!ctx.contact) return { ok: false, detail: 'create_note: sin contacto' };
  const body = fillTemplate(cfg.body || '', ctx);
  if (!body) return { ok: false, detail: 'create_note: sin contenido configurado' };
  await prisma.note.create({ data: { contactId: ctx.contact.id, body: `🤖 ${body}` } });
  return { ok: true, detail: `create_note: "${body}"` };
}

async function updateAppointmentStatus(ctx: AutomationContext, cfg: any): Promise<ActionResult> {
  if (!ctx.appointment || !cfg.status) {
    return { ok: false, detail: 'update_appointment_status: sin cita o sin status configurado' };
  }
  await prisma.appointment.update({ where: { id: ctx.appointment.id }, data: { status: cfg.status } });
  ctx.appointment.status = cfg.status;
  return { ok: true, detail: `update_appointment_status: → "${cfg.status}"` };
}

async function sendWebhook(ctx: AutomationContext, cfg: any): Promise<ActionResult> {
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
  const url = settings?.n8nWebhookUrl;
  if (!url) {
    return { ok: true, detail: 'send_webhook: sin URL de webhook configurada en Settings — paso omitido (placeholder)' };
  }
  const message = cfg.message ? fillTemplate(cfg.message, ctx) : undefined;
  // Canal de envío: lo elige el paso (cfg.channel); default 'whatsapp'.
  // n8n rutea con un Switch sobre este campo a la rama correspondiente.
  const channel = cfg.channel || 'whatsapp';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: cfg.event || 'automation.triggered',
        channel,
        message,
        contact: ctx.contact ? { id: ctx.contact.id, name: ctx.contact.name, email: ctx.contact.email, phone: ctx.contact.phone } : null,
        appointment: ctx.appointment ? { id: ctx.appointment.id, title: ctx.appointment.title, status: ctx.appointment.status, startTime: ctx.appointment.startTime } : null,
      }),
    });
    return { ok: res.ok, detail: `send_webhook: POST ${url} (${channel}) → ${res.status}` };
  } catch (e: any) {
    return { ok: false, detail: `send_webhook: error de red — ${e?.message || 'desconocido'}` };
  }
}
