'use client';

import React from 'react';
import { AppointmentModal } from './AppointmentModal';
import { CalendarFormModal } from './CalendarFormModal';
import { ConfirmDialog } from './ConfirmDialog';
import { GroupModal } from './GroupModal';
import { sendJson } from './calendar-api';
import type { ModalState, OpenModal } from './modal-state';
import type { CalendarActions } from './use-calendar-actions';
import type { CalendarData } from './use-calendar-data';
import toast from 'react-hot-toast';

interface Props {
  modal: ModalState | null;
  data: CalendarData;
  actions: CalendarActions;
  onClose: () => void;
  openModal: OpenModal;
}

/** Renderiza el diálogo abierto y conecta cada uno con su recarga de datos. */
export function ModalHost({ modal, data, actions, onClose, openModal }: Props) {
  if (!modal) return null;

  switch (modal.kind) {
    case 'group':
      return <GroupModal onClose={onClose} onCreated={() => { onClose(); actions.afterGroupChange(); }} />;

    case 'calendar':
      return (
        <CalendarFormModal
          calendar={modal.calendar} template={modal.template} groupId={modal.groupId} groups={data.groups.items}
          onClose={onClose} onSaved={() => { onClose(); actions.afterCalendarChange(); }}
        />
      );

    case 'appointment':
      return (
        <AppointmentModal
          appointment={modal.appointment} prefill={modal.prefill} calendars={data.calendars.items}
          onClose={onClose} onSaved={() => { onClose(); actions.afterAppointmentChange(); }}
          onRequestDelete={(appointment) => openModal({ kind: 'delete-appointment', appointment })}
        />
      );

    case 'delete-group': {
      const { group } = modal;
      return (
        <ConfirmDialog
          title="Eliminar grupo" description={`¿Eliminar «${group.name}»? Los calendarios quedarán sin agrupar.`}
          confirmLabel="Eliminar grupo" busyLabel="Eliminando…" onClose={onClose}
          onConfirm={async () => {
            const error = await sendJson(`/api/calendar-groups?id=${encodeURIComponent(group.id)}`, 'DELETE');
            if (error) return error;
            toast.success('Grupo eliminado.');
            onClose();
            actions.afterGroupChange();
            return null;
          }}
        />
      );
    }

    case 'delete-calendar': {
      const { calendar } = modal;
      return (
        <ConfirmDialog
          title="Eliminar calendario" description={`¿Eliminar «${calendar.name}»? Se eliminarán también sus citas. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar calendario" busyLabel="Eliminando…" onClose={onClose}
          onConfirm={async () => {
            const error = await sendJson(`/api/calendars/${calendar.id}`, 'DELETE');
            if (error) return error;
            toast.success('Calendario eliminado.');
            onClose();
            actions.afterCalendarDelete();
            return null;
          }}
        />
      );
    }

    case 'delete-appointment': {
      const { appointment } = modal;
      return (
        <ConfirmDialog
          title="Eliminar cita" description={`¿Eliminar «${appointment.title}» de forma permanente? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar cita" busyLabel="Eliminando…" onClose={onClose}
          onConfirm={async () => {
            const error = await sendJson(`/api/appointments/${appointment.id}`, 'DELETE');
            if (error) return error;
            toast.success('Cita eliminada.');
            onClose();
            actions.afterAppointmentChange();
            return null;
          }}
        />
      );
    }
  }
}
