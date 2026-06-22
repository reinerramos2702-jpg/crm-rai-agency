// src/lib/automations/conditions.ts
// Evaluación de triggers (¿este evento dispara este workflow?) y de
// condiciones de pasos (¿continúa la ejecución del workflow?)

import type { AutomationContext, WorkflowStep, WorkflowTrigger } from './types';

/**
 * Determina si un evento sincrónico (contact.created, contact.tag_added,
 * appointment.created, appointment.status_changed) hace match con la
 * configuración del trigger de un workflow.
 */
export function matchesSyncTrigger(
  trigger: WorkflowTrigger,
  eventType: string,
  ctx: AutomationContext
): boolean {
  if (trigger.type !== eventType) return false;
  const cfg = trigger.config || {};

  switch (eventType) {
    case 'contact.created': {
      // config.source opcional: 'manual' | 'whatsapp' | 'instagram' | 'email' | 'web'
      if (cfg.source && ctx.contact) {
        // el source viaja en config.source y se compara contra el que vino en el ctx (guardado aparte)
        return cfg.source === (ctx as any).source;
      }
      return true;
    }
    case 'contact.tag_added': {
      // config.tag (string) o config.tags (string[]): dispara si el tag agregado coincide con alguno
      if (cfg.tags && Array.isArray(cfg.tags)) {
        return cfg.tags.includes(ctx.tag);
      }
      if (!cfg.tag) return false;
      return cfg.tag === ctx.tag;
    }
    case 'appointment.created': {
      // config.calendarId opcional: limitar a un calendario específico
      if (cfg.calendarId) {
        return cfg.calendarId === (ctx as any).calendarId;
      }
      return true;
    }
    case 'appointment.status_changed': {
      // config.to obligatorio: 'cancelled' | 'completed' | 'no_show' | 'confirmed'
      if (!cfg.to) return false;
      return cfg.to === ctx.newStatus;
    }
    default:
      return false;
  }
}

/**
 * Evalúa un paso de tipo 'condition'. Devuelve true si la ejecución debe
 * continuar (la condición se cumple), false si debe detenerse ('skipped').
 */
export function evaluateCondition(step: WorkflowStep, ctx: AutomationContext): { pass: boolean; detail: string } {
  const cfg = step.config || {};
  const check = cfg.check as string;

  switch (check) {
    case 'tag_includes': {
      const tags = ctx.contact?.tags || [];
      const pass = !!cfg.tag && tags.includes(cfg.tag);
      return { pass, detail: `tag_includes(${cfg.tag}) → ${pass} (tags actuales: ${tags.join(', ') || '—'})` };
    }
    case 'tag_not_includes': {
      const tags = ctx.contact?.tags || [];
      const pass = !cfg.tag || !tags.includes(cfg.tag);
      return { pass, detail: `tag_not_includes(${cfg.tag}) → ${pass} (tags actuales: ${tags.join(', ') || '—'})` };
    }
    case 'appointment_status_is': {
      const status = ctx.appointment?.status;
      const pass = !!cfg.status && status === cfg.status;
      return { pass, detail: `appointment_status_is(${cfg.status}) → ${pass} (status actual: ${status || '—'})` };
    }
    case 'appointment_status_is_not': {
      const status = ctx.appointment?.status;
      const pass = !cfg.status || status !== cfg.status;
      return { pass, detail: `appointment_status_is_not(${cfg.status}) → ${pass} (status actual: ${status || '—'})` };
    }
    default:
      // condición desconocida: no bloquear el flujo, pero dejar registro
      return { pass: true, detail: `condición desconocida (${check}) — se ignora, continúa` };
  }
}

/** Convierte un paso 'delay' a milisegundos. */
export function delayToMs(step: WorkflowStep): number {
  const cfg = step.config || {};
  const amount = Number(cfg.amount) || 0;
  const unit = cfg.unit || 'hours';
  const factor = unit === 'minutes' ? 60_000 : unit === 'days' ? 86_400_000 : 3_600_000; // default horas
  return amount * factor;
}
