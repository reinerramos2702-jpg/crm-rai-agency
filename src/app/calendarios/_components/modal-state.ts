import type { Appointment, CalendarGroup, CalendarResource } from './calendar-types';
import type { CalendarTemplate } from './templates';

export interface AppointmentPrefill {
  calendarId?: string;
  start?: Date;
  end?: Date;
}

/** Diálogo abierto en la página (solo uno a la vez). */
export type ModalState =
  | { kind: 'group' }
  | { kind: 'calendar'; calendar: CalendarResource | null; template: CalendarTemplate | null; groupId: string }
  | { kind: 'appointment'; appointment: Appointment | null; prefill: AppointmentPrefill }
  | { kind: 'delete-group'; group: CalendarGroup }
  | { kind: 'delete-calendar'; calendar: CalendarResource }
  | { kind: 'delete-appointment'; appointment: Appointment };

export type OpenModal = (modal: ModalState) => void;
