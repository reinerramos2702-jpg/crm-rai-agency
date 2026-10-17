import type { WorkflowStep } from '@/lib/automations/types';
import { isRecord, isStepType, isTriggerType } from '../guards';
import type { DetailRun, WorkflowDetail } from './types';

function parseStep(value: unknown): WorkflowStep | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !isStepType(value.type)) return null;
  return { id: value.id, type: value.type, config: isRecord(value.config) ? value.config : {} };
}

function parseRun(value: unknown): DetailRun | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.createdAt !== 'string') return null;
  return {
    id: value.id,
    status: typeof value.status === 'string' ? value.status : 'pending',
    error: typeof value.error === 'string' ? value.error : null,
    createdAt: value.createdAt,
  };
}

/**
 * Convierte la respuesta de GET /api/automations/[id] en un detalle tipado.
 * Devuelve null si la forma no es la esperada (así la pantalla muestra un error y no datos a medias).
 */
export function parseWorkflowDetail(body: unknown): WorkflowDetail | null {
  if (!isRecord(body) || !isRecord(body.workflow)) return null;
  const w = body.workflow;
  if (typeof w.id !== 'string' || typeof w.name !== 'string') return null;
  const trigger = isRecord(w.trigger) ? w.trigger : {};
  return {
    id: w.id,
    name: w.name,
    description: typeof w.description === 'string' ? w.description : null,
    folderId: typeof w.folderId === 'string' ? w.folderId : null,
    status: typeof w.status === 'string' ? w.status : 'draft',
    trigger: {
      type: isTriggerType(trigger.type) ? trigger.type : 'contact.created',
      config: isRecord(trigger.config) ? trigger.config : {},
    },
    steps: Array.isArray(w.steps) ? w.steps.map(parseStep).filter((s): s is WorkflowStep => s !== null) : [],
    runs: Array.isArray(w.runs) ? w.runs.map(parseRun).filter((r): r is DetailRun => r !== null) : [],
  };
}
