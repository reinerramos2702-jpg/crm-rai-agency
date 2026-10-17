import { TRIGGER_META } from '@/lib/automations/ui-meta';
import type { StepType, TriggerType } from '@/lib/automations/types';
import type { AutomationsPayload, RunsPayload, WorkflowT } from './types';

/** Guardas de tipo para datos que llegan de la red o de controles de formulario. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isTriggerType(value: unknown): value is TriggerType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TRIGGER_META, value);
}

export function isStepType(value: unknown): value is StepType {
  return value === 'condition' || value === 'delay' || value === 'action';
}

/** Devuelve el valor si es una de las opciones permitidas; si no, `undefined`. */
export function pickOption<T extends string>(options: readonly T[], value: string): T | undefined {
  return options.find((o) => o === value);
}

export function isWorkflowResponse(value: unknown): value is { workflow: WorkflowT } {
  return isRecord(value) && isRecord(value.workflow) && typeof value.workflow.id === 'string';
}

export function isFolderResponse(value: unknown): value is { folder?: { id: string; name: string } } {
  if (!isRecord(value)) return false;
  const f = value.folder;
  return f === undefined || (isRecord(f) && typeof f.id === 'string' && typeof f.name === 'string');
}

export function isRunsPayload(value: unknown): value is RunsPayload {
  return isRecord(value) && Array.isArray(value.runs) && (value.nextCursor === null || typeof value.nextCursor === 'string');
}

export function isAutomationsPayload(value: unknown): value is AutomationsPayload {
  return isRecord(value) && Array.isArray(value.folders) && Array.isArray(value.workflows);
}
