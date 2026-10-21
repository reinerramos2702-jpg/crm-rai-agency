import type { AvailabilityForm } from './availability';
import { clearedAvailabilityForm } from './availability';
import type { CalendarTypeId, DayKey } from './calendar-types';

/** Plantilla de arranque: preselecciona el formulario de un calendario nuevo. */
export interface CalendarTemplate {
  id: string;
  label: string;
  /** Texto corto para la tarjeta de la plantilla. */
  summary: string;
  name: string;
  description: string;
  type: CalendarTypeId;
  durationMins: number;
  days: readonly DayKey[];
  start: string;
  end: string;
}

const WEEKDAYS: readonly DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

export const CALENDAR_TEMPLATES: readonly CalendarTemplate[] = [
  {
    id: 'consulta',
    label: 'Consulta',
    summary: 'Sesiones de 45 min con cada cliente.',
    name: 'Consulta',
    description: 'Consulta individual con un cliente o paciente.',
    type: 'personal',
    durationMins: 45,
    days: WEEKDAYS,
    start: '09:00',
    end: '17:00',
  },
  {
    id: 'reunion-ventas',
    label: 'Reunión de ventas',
    summary: 'Reuniones de 30 min para presentar y cerrar.',
    name: 'Reunión de ventas',
    description: 'Reunión comercial para presentar la propuesta y resolver dudas.',
    type: 'personal',
    durationMins: 30,
    days: WEEKDAYS,
    start: '10:00',
    end: '17:00',
  },
  {
    id: 'llamada-descubrimiento',
    label: 'Llamada de descubrimiento',
    summary: 'Llamadas de 20 min para conocer al prospecto.',
    name: 'Llamada de descubrimiento',
    description: 'Primera llamada breve para entender las necesidades del prospecto.',
    type: 'personal',
    durationMins: 20,
    days: WEEKDAYS,
    start: '09:00',
    end: '16:00',
  },
];

export function findTemplate(id: string): CalendarTemplate | undefined {
  return CALENDAR_TEMPLATES.find((t) => t.id === id);
}

/** Disponibilidad semanal de la plantilla en formato de formulario. */
export function templateAvailability(t: CalendarTemplate): AvailabilityForm {
  const form = clearedAvailabilityForm();
  for (const day of t.days) form[day] = { enabled: true, start: t.start, end: t.end };
  return form;
}
