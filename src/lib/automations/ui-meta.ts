// src/lib/automations/ui-meta.ts
// Metadatos de UI (labels, descripciones, campos de configuración) para el
// builder de Automatización. Solo describe cómo renderizar formularios —
// la lógica de ejecución vive en conditions.ts / actions.ts / engine.ts.

import type { ActionType, ConditionCheck, TriggerType } from './types';

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'tags';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  default?: string | number;
}

export interface TriggerMeta {
  label: string;
  description: string;
  category: 'evento' | 'tiempo';
  fields: FieldDef[];
}

const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'completed', label: 'Completada' },
  { value: 'no_show', label: 'No asistió' },
];

export const TRIGGER_META: Record<TriggerType, TriggerMeta> = {
  'contact.created': {
    label: 'Nuevo contacto creado',
    description: 'Se dispara cada vez que entra un contacto nuevo (manual, WhatsApp, Instagram, formulario web, etc.).',
    category: 'evento',
    fields: [
      {
        key: 'source',
        label: 'Origen (opcional)',
        type: 'select',
        options: [
          { value: '', label: 'Cualquier origen' },
          { value: 'manual', label: 'Manual' },
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'instagram', label: 'Instagram' },
          { value: 'email', label: 'Email' },
          { value: 'web', label: 'Web / Reserva online' },
        ],
      },
    ],
  },
  'contact.tag_added': {
    label: 'Se agrega una etiqueta a un contacto',
    description: 'Se dispara cuando un contacto recibe una o varias etiquetas específicas (ej. "compra_confirmada", "pedido_enviado").',
    category: 'evento',
    fields: [
      {
        key: 'tagsInput',
        label: 'Etiqueta(s) que disparan el flujo',
        type: 'text',
        placeholder: 'ej: pedido_enviado  (o varias separadas por coma)',
        help: 'Si escribes varias separadas por coma, el flujo se dispara cuando se agregue cualquiera de ellas.',
      },
    ],
  },
  'appointment.created': {
    label: 'Nueva cita creada',
    description: 'Se dispara al crear una cita (manualmente o desde la página pública de reservas).',
    category: 'evento',
    fields: [
      {
        key: 'calendarId',
        label: 'ID de calendario (opcional)',
        type: 'text',
        placeholder: 'Dejar vacío para todos los calendarios',
      },
    ],
  },
  'appointment.status_changed': {
    label: 'Cambio de estado de una cita',
    description: 'Se dispara cuando una cita cambia a un estado específico.',
    category: 'evento',
    fields: [
      {
        key: 'to',
        label: 'Nuevo estado',
        type: 'select',
        options: APPOINTMENT_STATUS_OPTIONS,
      },
    ],
  },
  'appointment.upcoming': {
    label: 'Cita próxima (recordatorio)',
    description: 'Revisa periódicamente las citas confirmadas y dispara el flujo cuando falta el tiempo indicado.',
    category: 'tiempo',
    fields: [
      { key: 'hoursBefore', label: 'Horas antes de la cita', type: 'number', default: 24 },
    ],
  },
  'appointment.completed': {
    label: 'Cita completada (seguimiento)',
    description: 'Dispara el flujo un tiempo después de que una cita se marca como completada.',
    category: 'tiempo',
    fields: [
      { key: 'hoursAfter', label: 'Horas después de completarse', type: 'number', default: 2 },
    ],
  },
  'contact.inactive': {
    label: 'Contacto inactivo',
    description: 'Detecta contactos sin actividad reciente (sin cambios) durante N días.',
    category: 'tiempo',
    fields: [
      { key: 'days', label: 'Días sin actividad', type: 'number', default: 30 },
    ],
  },
  'conversation.sla_overdue': {
    label: 'ANS / SLA vencido',
    description: 'Detecta conversaciones abiertas donde el equipo no ha respondido a tiempo.',
    category: 'tiempo',
    fields: [
      { key: 'overdueMins', label: 'Minutos sin respuesta del equipo', type: 'number', default: 60 },
    ],
  },
  'conversation.no_response': {
    label: 'Conversación fría (sin respuesta)',
    description: 'Detecta conversaciones sin mensajes nuevos (de ningún lado) durante N días.',
    category: 'tiempo',
    fields: [
      { key: 'days', label: 'Días sin nuevos mensajes', type: 'number', default: 3 },
    ],
  },
  'schedule.recurring': {
    label: 'Revisión periódica (programada)',
    description: 'Se evalúa en cada corrida del cron sobre tareas de contacto o sobre todos los contactos; usa pasos de "condición" para filtrar.',
    category: 'tiempo',
    fields: [
      {
        key: 'target',
        label: 'Aplicar sobre',
        type: 'select',
        options: [
          { value: 'contactTask', label: 'Tareas de contacto pendientes' },
          { value: 'contact', label: 'Todos los contactos' },
        ],
      },
      {
        key: 'dueWithinHours',
        label: 'Tareas que vencen dentro de (horas)',
        type: 'number',
        default: 48,
        help: 'Solo aplica si elegiste "Tareas de contacto pendientes".',
      },
    ],
  },
  'appointment.overdue': {
    label: 'Cita vencida sin asistencia (no-show)',
    description: 'Detecta citas confirmadas cuyo horario ya pasó y aún no se marcaron como completadas/canceladas.',
    category: 'tiempo',
    fields: [
      { key: 'graceMins', label: 'Minutos de tolerancia tras la hora de inicio', type: 'number', default: 30 },
    ],
  },
  'contact.milestone': {
    label: 'Hito de cliente (recompras / fidelidad)',
    description: 'Asciende a un contacto cuando acumula N ejecuciones exitosas de OTRO flujo (ej. "Agradecimiento + cross-sell").',
    category: 'tiempo',
    fields: [
      {
        key: 'sourceWorkflowId',
        label: 'ID del flujo fuente',
        type: 'text',
        placeholder: 'Copia el ID del flujo a contar (ver URL del editor)',
        help: 'Abre el otro flujo y copia el ID que aparece al final de la URL.',
      },
      { key: 'minRuns', label: 'Ejecuciones exitosas mínimas', type: 'number', default: 3 },
    ],
  },
};

export const TRIGGER_ORDER: TriggerType[] = [
  'contact.created',
  'contact.tag_added',
  'appointment.created',
  'appointment.status_changed',
  'appointment.upcoming',
  'appointment.completed',
  'appointment.overdue',
  'contact.inactive',
  'conversation.sla_overdue',
  'conversation.no_response',
  'schedule.recurring',
  'contact.milestone',
];

export interface ActionMeta {
  label: string;
  fields: FieldDef[];
}

export const ACTION_META: Record<ActionType, ActionMeta> = {
  add_tag: {
    label: 'Agregar etiqueta al contacto',
    fields: [{ key: 'tag', label: 'Etiqueta', type: 'text', placeholder: 'ej: cliente_vip' }],
  },
  remove_tag: {
    label: 'Quitar etiqueta del contacto',
    fields: [{ key: 'tag', label: 'Etiqueta', type: 'text', placeholder: 'ej: nuevo_lead' }],
  },
  create_task: {
    label: 'Crear tarea para el contacto',
    fields: [
      { key: 'title', label: 'Título de la tarea', type: 'text', placeholder: 'ej: Llamar a {{contact.name}}' },
      { key: 'dueInHours', label: 'Vence en (horas)', type: 'number', default: 24 },
    ],
  },
  create_note: {
    label: 'Crear nota en el contacto',
    fields: [{ key: 'body', label: 'Texto de la nota', type: 'textarea', placeholder: 'ej: Seguimiento automático enviado.' }],
  },
  update_appointment_status: {
    label: 'Cambiar estado de la cita',
    fields: [{ key: 'status', label: 'Nuevo estado', type: 'select', options: APPOINTMENT_STATUS_OPTIONS }],
  },
  send_webhook: {
    label: 'Enviar notificación (webhook / n8n)',
    fields: [
      {
        key: 'channel',
        label: 'Canal de envío',
        type: 'select',
        default: 'whatsapp',
        help: 'n8n rutea la notificación al canal elegido (Switch sobre "channel").',
        options: [
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'email', label: 'Email' },
          { value: 'slack', label: 'Slack' },
          { value: 'telegram', label: 'Telegram' },
        ],
      },
      { key: 'event', label: 'Nombre del evento', type: 'text', placeholder: 'ej: appointment.reminder' },
      { key: 'message', label: 'Mensaje', type: 'textarea', placeholder: 'Hola {{contact.name}}...' },
    ],
  },
};

export const ACTION_ORDER: ActionType[] = [
  'send_webhook',
  'add_tag',
  'remove_tag',
  'create_task',
  'create_note',
  'update_appointment_status',
];

export interface ConditionMeta {
  label: string;
  fields: FieldDef[];
}

export const CONDITION_META: Record<ConditionCheck, ConditionMeta> = {
  tag_includes: {
    label: 'El contacto TIENE la etiqueta',
    fields: [{ key: 'tag', label: 'Etiqueta', type: 'text', placeholder: 'ej: cliente_mayorista' }],
  },
  tag_not_includes: {
    label: 'El contacto NO TIENE la etiqueta',
    fields: [{ key: 'tag', label: 'Etiqueta', type: 'text', placeholder: 'ej: vip' }],
  },
  appointment_status_is: {
    label: 'La cita está en estado',
    fields: [{ key: 'status', label: 'Estado', type: 'select', options: APPOINTMENT_STATUS_OPTIONS }],
  },
  appointment_status_is_not: {
    label: 'La cita NO está en estado',
    fields: [{ key: 'status', label: 'Estado', type: 'select', options: APPOINTMENT_STATUS_OPTIONS }],
  },
};

export const CONDITION_ORDER: ConditionCheck[] = [
  'tag_includes',
  'tag_not_includes',
  'appointment_status_is',
  'appointment_status_is_not',
];

export const PLACEHOLDER_HELP =
  'Variables disponibles: {{contact.name}}, {{contact.email}}, {{contact.phone}}, {{appointment.title}}, {{appointment.startTime}}, {{event.tag}}';

export const NICHE_LABELS: Record<string, string> = {
  servicios: 'Servicios / Citas',
  retail: 'Retail (detal)',
  mayoreo: 'Mayoreo',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  paused: 'Pausado',
};

export const RUN_STATUS_LABELS: Record<string, string> = {
  success: 'Exitoso',
  error: 'Error',
  skipped: 'Omitido (condición)',
  pending: 'Pendiente (en espera)',
};
