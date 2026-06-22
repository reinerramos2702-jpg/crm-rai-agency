// src/lib/automations/templates.ts
// Las 15 plantillas de automatización (5 Servicios/Citas, 5 Retail, 5 Mayoreo).
// Cada una clona { name, description, niche, trigger, steps } al crear el Workflow.
// Todos los campos "N días/horas" quedan en `trigger.config` o `step.config`
// para que el usuario los ajuste en el builder antes de activar.

import type { WorkflowStep, WorkflowTrigger } from './types';

export interface WorkflowTemplate {
  id: string;
  niche: 'servicios' | 'retail' | 'mayoreo';
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

const step = (type: WorkflowStep['type'], config: Record<string, any>, idx: number): WorkflowStep => ({
  id: `step_${idx}`,
  type,
  config,
});

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ===================== SERVICIOS / CITAS =====================
  {
    id: 'servicios_recordatorio_24h',
    niche: 'servicios',
    name: 'Recordatorio de cita (24h antes)',
    description: 'Envía un recordatorio automático y registra una nota cuando falta poco para una cita confirmada.',
    trigger: { type: 'appointment.upcoming', config: { hoursBefore: 24 } },
    steps: [
      step('action', { action: 'send_webhook', event: 'appointment.reminder', message: 'Recordatorio: {{contact.name}} tiene cita "{{appointment.title}}" el {{appointment.startTime}}.' }, 0),
      step('action', { action: 'create_note', body: 'Recordatorio de cita enviado automáticamente (24h antes).' }, 1),
    ],
  },
  {
    id: 'servicios_confirmacion_reserva',
    niche: 'servicios',
    name: 'Confirmación al reservar',
    description: 'Cuando un cliente reserva desde la página pública de booking, envía confirmación y lo etiqueta.',
    trigger: { type: 'appointment.created', config: {} },
    steps: [
      step('action', { action: 'send_webhook', event: 'appointment.confirmed', message: '¡Reserva confirmada! {{contact.name}}, tu cita "{{appointment.title}}" quedó agendada para el {{appointment.startTime}}.' }, 0),
      step('action', { action: 'add_tag', tag: 'cliente_calendario' }, 1),
    ],
  },
  {
    id: 'servicios_no_show',
    niche: 'servicios',
    name: 'Detección de no-show',
    description: 'Marca automáticamente como "no asistió" las citas confirmadas cuyo horario ya pasó, y crea tarea para reagendar.',
    trigger: { type: 'appointment.overdue', config: { graceMins: 30 } },
    steps: [
      step('action', { action: 'update_appointment_status', status: 'no_show' }, 0),
      step('action', { action: 'create_task', title: 'Reagendar cita de {{contact.name}}', dueInHours: 24 }, 1),
      step('action', { action: 'add_tag', tag: 'no_show' }, 2),
    ],
  },
  {
    id: 'servicios_seguimiento_post_cita',
    niche: 'servicios',
    name: 'Seguimiento post-cita (encuesta)',
    description: 'Tras completarse una cita, envía una encuesta de satisfacción una sola vez por cita.',
    trigger: { type: 'appointment.completed', config: { hoursAfter: 24 } },
    steps: [
      step('condition', { check: 'tag_not_includes', tag: 'post_cita_enviado' }, 0),
      step('action', { action: 'send_webhook', event: 'appointment.followup', message: 'Hola {{contact.name}}, ¿cómo fue tu experiencia en "{{appointment.title}}"? Nos encantaría tu opinión.' }, 1),
      step('action', { action: 'add_tag', tag: 'post_cita_enviado' }, 2),
    ],
  },
  {
    id: 'servicios_reactivacion_inactivo',
    niche: 'servicios',
    name: 'Reactivación de cliente inactivo',
    description: 'Detecta clientes de servicios sin actividad reciente y dispara una campaña de reenganche.',
    trigger: { type: 'contact.inactive', config: { days: 60 } },
    steps: [
      step('condition', { check: 'tag_not_includes', tag: 'reactivar_servicio' }, 0),
      step('action', { action: 'add_tag', tag: 'reactivar_servicio' }, 1),
      step('action', { action: 'create_task', title: 'Reenganchar a {{contact.name}} (cliente inactivo)', dueInHours: 48 }, 2),
      step('action', { action: 'send_webhook', event: 'contact.reactivation', message: 'Hola {{contact.name}}, ¡hace tiempo no te vemos! Tenemos novedades para ti.' }, 3),
    ],
  },

  // ===================== RETAIL =====================
  {
    id: 'retail_bienvenida_lead',
    niche: 'retail',
    name: 'Bienvenida a nuevo lead',
    description: 'Da la bienvenida automática a cada nuevo contacto y crea una tarea de primer contacto.',
    trigger: { type: 'contact.created', config: {} },
    steps: [
      step('action', { action: 'send_webhook', event: 'contact.welcome', message: '¡Hola {{contact.name}}! Gracias por escribirnos, en breve te atenderemos.' }, 0),
      step('action', { action: 'add_tag', tag: 'nuevo_lead' }, 1),
      step('action', { action: 'create_task', title: 'Primer contacto con {{contact.name}}', dueInHours: 1 }, 2),
    ],
  },
  {
    id: 'retail_sla_vencido',
    niche: 'retail',
    name: 'Alerta de ANS (SLA) vencido',
    description: 'Si una conversación abierta lleva demasiado tiempo sin respuesta del equipo, alerta y crea tarea urgente.',
    trigger: { type: 'conversation.sla_overdue', config: { overdueMins: 60 } },
    steps: [
      step('action', { action: 'add_tag', tag: 'sla_vencido' }, 0),
      step('action', { action: 'send_webhook', event: 'conversation.sla_overdue', channel: 'slack', message: 'ANS vencido: {{contact.name}} espera respuesta hace más de 1 hora.' }, 1),
      step('action', { action: 'create_task', title: 'URGENTE: responder a {{contact.name}} (ANS vencido)', dueInHours: 1 }, 2),
    ],
  },
  {
    id: 'retail_reenganche_frio',
    niche: 'retail',
    name: 'Reenganche de conversación fría',
    description: 'Reabre el contacto con clientes cuya conversación quedó sin movimiento por varios días.',
    trigger: { type: 'conversation.no_response', config: { days: 3 } },
    steps: [
      step('condition', { check: 'tag_not_includes', tag: 'seguimiento_enviado' }, 0),
      step('action', { action: 'send_webhook', event: 'conversation.followup', message: 'Hola {{contact.name}}, ¿seguimos en contacto? Quedamos atentos a cualquier consulta.' }, 1),
      step('action', { action: 'add_tag', tag: 'seguimiento_enviado' }, 2),
    ],
  },
  {
    id: 'retail_agradecimiento_cross_sell',
    niche: 'retail',
    name: 'Agradecimiento + cross-sell tras compra',
    description: 'Agradece la compra al instante y, 3 días después, envía una recomendación de productos relacionados.',
    trigger: { type: 'contact.tag_added', config: { tag: 'compra_confirmada' } },
    steps: [
      step('action', { action: 'send_webhook', event: 'purchase.thanks', message: '¡Gracias por tu compra, {{contact.name}}!' }, 0),
      step('delay', { amount: 3, unit: 'days' }, 1),
      step('action', { action: 'send_webhook', event: 'purchase.cross_sell', message: 'Hola {{contact.name}}, ¡tenemos productos que combinan perfecto con tu compra!' }, 2),
      step('action', { action: 'add_tag', tag: 'cross_sell_enviado' }, 3),
    ],
  },
  {
    id: 'retail_vip_recompra',
    niche: 'retail',
    name: 'Cliente VIP por recompra',
    description: 'Cuando un cliente acumula varias compras (cross-sell exitosos), lo asciende a VIP y crea tarea de seguimiento personal. Requiere indicar el ID del flujo "Agradecimiento + cross-sell" como fuente.',
    trigger: { type: 'contact.milestone', config: { sourceWorkflowId: '', minRuns: 3 } },
    steps: [
      step('condition', { check: 'tag_not_includes', tag: 'vip' }, 0),
      step('action', { action: 'add_tag', tag: 'vip' }, 1),
      step('action', { action: 'create_task', title: 'Llamar a {{contact.name}} — programa VIP', dueInHours: 24 }, 2),
    ],
  },

  // ===================== MAYOREO =====================
  {
    id: 'mayoreo_recordatorio_reposicion',
    niche: 'mayoreo',
    name: 'Recordatorio de reposición de pedido',
    description: 'Avisa a clientes mayoristas con tareas de "próxima reorden" próximas a vencer.',
    trigger: { type: 'schedule.recurring', config: { target: 'contactTask', dueWithinHours: 48 } },
    steps: [
      step('condition', { check: 'tag_includes', tag: 'pedido_registrado' }, 0),
      step('condition', { check: 'tag_not_includes', tag: 'recordatorio_enviado' }, 1),
      step('action', { action: 'send_webhook', event: 'order.reminder', message: 'Hola {{contact.name}}, recuerda tu próximo pedido de reposición.' }, 2),
      step('action', { action: 'add_tag', tag: 'recordatorio_enviado' }, 3),
    ],
  },
  {
    id: 'mayoreo_pedido_grande',
    niche: 'mayoreo',
    name: 'Pedido grande → validación de gerente',
    description: 'Cuando se etiqueta un pedido como "grande", alerta a gerencia y crea tarea de validación.',
    trigger: { type: 'contact.tag_added', config: { tag: 'pedido_grande' } },
    steps: [
      step('action', { action: 'send_webhook', event: 'order.large_order_alert', channel: 'slack', message: 'Pedido grande de {{contact.name}} requiere validación de gerencia.' }, 0),
      step('action', { action: 'create_task', title: 'Validar pedido grande de {{contact.name}}', dueInHours: 4 }, 1),
    ],
  },
  {
    id: 'mayoreo_cliente_riesgo',
    niche: 'mayoreo',
    name: 'Cliente mayorista en riesgo de abandono',
    description: 'Detecta mayoristas sin actividad reciente y dispara reenganche con catálogo.',
    trigger: { type: 'contact.inactive', config: { days: 45 } },
    steps: [
      step('condition', { check: 'tag_includes', tag: 'cliente_mayorista' }, 0),
      step('condition', { check: 'tag_not_includes', tag: 'riesgo_abandono' }, 1),
      step('action', { action: 'add_tag', tag: 'riesgo_abandono' }, 2),
      step('action', { action: 'create_task', title: 'Reenganchar mayorista {{contact.name}}', dueInHours: 24 }, 3),
      step('action', { action: 'send_webhook', event: 'wholesale.winback', message: 'Hola {{contact.name}}, te compartimos nuestro catálogo actualizado.' }, 4),
    ],
  },
  {
    id: 'mayoreo_actualizacion_pedido',
    niche: 'mayoreo',
    name: 'Actualización de estado de pedido',
    description: 'Notifica al cliente cuando su pedido cambia de estado (preparando, enviado, entregado).',
    trigger: { type: 'contact.tag_added', config: { tags: ['pedido_preparando', 'pedido_enviado', 'pedido_entregado'] } },
    steps: [
      step('action', { action: 'send_webhook', event: 'order.status_update', message: 'Hola {{contact.name}}, el estado de tu pedido cambió a: {{event.tag}}.' }, 0),
      step('action', { action: 'create_note', body: 'Estado de pedido actualizado a "{{event.tag}}" — notificación enviada.' }, 1),
    ],
  },
  {
    id: 'mayoreo_onboarding_cliente',
    niche: 'mayoreo',
    name: 'Onboarding de cliente mayorista',
    description: 'Secuencia de bienvenida en 3 pasos para nuevos clientes mayoristas: catálogo, onboarding y llamada.',
    trigger: { type: 'contact.tag_added', config: { tag: 'cliente_mayorista' } },
    steps: [
      step('action', { action: 'send_webhook', event: 'wholesale.onboarding_day0', message: 'Bienvenido {{contact.name}}, aquí tienes nuestro catálogo mayorista.' }, 0),
      step('delay', { amount: 2, unit: 'days' }, 1),
      step('action', { action: 'send_webhook', event: 'wholesale.onboarding_day2', message: 'Hola {{contact.name}}, ¿tienes dudas sobre cómo hacer tu primer pedido?' }, 2),
      step('delay', { amount: 3, unit: 'days' }, 3),
      step('action', { action: 'create_task', title: 'Llamada de seguimiento con {{contact.name}}', dueInHours: 24 }, 4),
    ],
  },
];

export function getTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}
