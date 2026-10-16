/** Exportación e importación de flujos en JSON (respaldo o traspaso entre espacios de trabajo). */

import { TRIGGER_META } from './automations/ui-meta';
import type { TriggerType, WorkflowStep, WorkflowTrigger } from './automations/types';

export const BACKUP_VERSION = 1;
export const MAX_IMPORT_FLOWS = 50;
export const MAX_IMPORT_BYTES = 2_000_000;

export interface ExportableFlow {
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

export interface FlowsBackup {
  app: 'rai-automatizacion';
  version: number;
  exportedAt: string;
  workflows: ExportableFlow[];
}

export type ParseResult = { ok: true; flows: ExportableFlow[] } | { ok: false; error: string };

const STEP_TYPES = new Set(['condition', 'delay', 'action']);

export function buildBackup(
  flows: { name: string; description: string | null; trigger: WorkflowTrigger; steps: WorkflowStep[] }[],
  now = new Date()
): FlowsBackup {
  return {
    app: 'rai-automatizacion',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    workflows: flows.map(({ name, description, trigger, steps }) => ({ name, description, trigger, steps })),
  };
}

export function backupFileName(now = new Date()): string {
  return `flujos-automatizacion-${now.toISOString().slice(0, 10)}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseFlow(raw: unknown, index: number): ExportableFlow | string {
  const label = `Flujo ${index + 1}`;
  if (!isRecord(raw)) return `${label}: formato inválido.`;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return `${label}: falta el nombre.`;
  const trigger = raw.trigger;
  if (!isRecord(trigger) || typeof trigger.type !== 'string' || !Object.prototype.hasOwnProperty.call(TRIGGER_META, trigger.type)) {
    return `${label} («${name}»): el disparador no es válido.`;
  }
  const config = isRecord(trigger.config) ? trigger.config : {};
  const steps = raw.steps === undefined ? [] : raw.steps;
  if (!Array.isArray(steps)) return `${label} («${name}»): los pasos no son una lista.`;
  for (const step of steps) {
    if (!isRecord(step) || typeof step.type !== 'string' || !STEP_TYPES.has(step.type) || !isRecord(step.config)) {
      return `${label} («${name}»): hay un paso con formato inválido.`;
    }
  }
  return {
    name: name.slice(0, 120),
    description: typeof raw.description === 'string' && raw.description.trim() ? raw.description : null,
    trigger: { type: trigger.type as TriggerType, config },
    steps: steps as WorkflowStep[],
  };
}

/** Valida el texto de un archivo de respaldo. Devuelve los flujos o un mensaje de error listo para mostrar. */
export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'El archivo es demasiado grande.' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }
  const list = Array.isArray(data) ? data : isRecord(data) ? data.workflows : undefined;
  if (!Array.isArray(list) || list.length === 0) return { ok: false, error: 'No se encontraron flujos en el archivo.' };
  if (list.length > MAX_IMPORT_FLOWS) return { ok: false, error: `Se pueden importar hasta ${MAX_IMPORT_FLOWS} flujos a la vez.` };
  const flows: ExportableFlow[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const parsed = parseFlow(list[i], i);
    if (typeof parsed === 'string') return { ok: false, error: parsed };
    flows.push(parsed);
  }
  return { ok: true, flows };
}
