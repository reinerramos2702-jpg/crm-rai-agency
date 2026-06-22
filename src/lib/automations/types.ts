// src/lib/automations/types.ts
// Tipos compartidos del motor de Automatización (Workflow / WorkflowRun)

export type TriggerType =
  | 'contact.created'
  | 'contact.tag_added'
  | 'appointment.created'
  | 'appointment.status_changed'
  | 'appointment.upcoming'
  | 'appointment.completed'
  | 'contact.inactive'
  | 'conversation.sla_overdue'
  | 'conversation.no_response'
  | 'schedule.recurring'
  | 'appointment.overdue'
  | 'contact.milestone';

export interface WorkflowTrigger {
  type: TriggerType;
  config: Record<string, any>;
}

export type StepType = 'condition' | 'delay' | 'action';

export type ActionType =
  | 'add_tag'
  | 'remove_tag'
  | 'create_task'
  | 'create_note'
  | 'update_appointment_status'
  | 'send_webhook';

// Canales de notificación soportados por la acción send_webhook.
// El payload incluye `channel`; n8n rutea con un nodo Switch a la rama correcta.
export type WebhookChannel = 'whatsapp' | 'email' | 'slack' | 'telegram';

export const WEBHOOK_CHANNELS: { value: WebhookChannel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'telegram', label: 'Telegram' },
];

export type ConditionCheck =
  | 'tag_includes'
  | 'tag_not_includes'
  | 'appointment_status_is'
  | 'appointment_status_is_not';

export interface WorkflowStep {
  id: string;
  type: StepType;
  // condition: { check: ConditionCheck, tag?, status? }
  // delay:     { amount: number, unit: 'minutes' | 'hours' | 'days' }
  // action:    { action: ActionType, ...config }
  config: Record<string, any>;
}

// Contexto disponible durante la ejecución de un workflow.
// `contact`/`appointment`/`conversation` son snapshots mutables (las acciones
// pueden modificarlas in-memory para que los pasos siguientes vean el cambio).
export interface AutomationContext {
  workspaceId: string;
  contact?: { id: string; name: string; email: string | null; phone: string | null; tags: string[] } | null;
  appointment?: { id: string; status: string; title: string; startTime: Date; endTime: Date } | null;
  conversation?: { id: string; status: string } | null;
  // Para 'contact.tag_added': el tag que disparó el evento
  tag?: string;
  // Para 'appointment.status_changed': el nuevo estado
  newStatus?: string;
}

// Resultado acumulado de la ejecución de un workflow, guardado en WorkflowRun.result
export interface WorkflowRunResult {
  log: { step: string; ok: boolean; detail: string }[];
  resumeAtStep?: number; // si quedó pendiente por un 'delay'
}
