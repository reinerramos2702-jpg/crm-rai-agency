import {
  ACTION_META,
  ACTION_ORDER,
  CONDITION_META,
  CONDITION_ORDER,
  type FieldDef,
} from '@/lib/automations/ui-meta';
import type { ActionType, ConditionCheck, StepType, WorkflowStep } from '@/lib/automations/types';
import { isStepType, isTriggerType } from '../guards';

export { isStepType, isTriggerType };

export type ConfigMap = WorkflowStep['config'];

export const STEP_TYPES: readonly StepType[] = ['condition', 'delay', 'action'];

export const STEP_LABELS: Record<StepType, string> = { condition: 'Condición', delay: 'Espera', action: 'Acción' };

export const UNIT_LABELS: Record<string, [string, string]> = {
  minutes: ['minuto', 'minutos'],
  hours: ['hora', 'horas'],
  days: ['día', 'días'],
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Valores iniciales de un formulario: el `default` del campo, la primera opción de un selector o vacío. */
export function defaultsForFields(fields: FieldDef[]): ConfigMap {
  const cfg: ConfigMap = {};
  for (const f of fields) {
    if (f.default !== undefined) cfg[f.key] = f.default;
    else if (f.type === 'select' && f.options && f.options.length > 0) cfg[f.key] = f.options[0].value;
    else cfg[f.key] = '';
  }
  return cfg;
}

export function newStep(type: StepType): WorkflowStep {
  if (type === 'condition') {
    const check = CONDITION_ORDER[0];
    return { id: uid(), type, config: { check, ...defaultsForFields(CONDITION_META[check].fields) } };
  }
  if (type === 'delay') {
    return { id: uid(), type, config: { amount: 1, unit: 'hours' } };
  }
  const action = ACTION_ORDER[0];
  return { id: uid(), type, config: { action, ...defaultsForFields(ACTION_META[action].fields) } };
}

export function isConditionCheck(value: unknown): value is ConditionCheck {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CONDITION_META, value);
}

export function isActionType(value: unknown): value is ActionType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ACTION_META, value);
}

/** Resumen de una línea de lo que hace un paso (para el encabezado de la tarjeta). */
export function summarizeStep(step: WorkflowStep): string {
  const cfg = step.config;
  if (step.type === 'delay') {
    const amount = Number(cfg.amount) || 1;
    const unit = UNIT_LABELS[String(cfg.unit)] ?? UNIT_LABELS.hours;
    return `Esperar ${amount} ${amount === 1 ? unit[0] : unit[1]}`;
  }
  if (step.type === 'condition') {
    return isConditionCheck(cfg.check) ? CONDITION_META[cfg.check].label : 'Condición';
  }
  return isActionType(cfg.action) ? ACTION_META[cfg.action].label : 'Acción';
}
