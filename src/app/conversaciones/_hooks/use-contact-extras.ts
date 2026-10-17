'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { sendJson } from '../_lib/conv-http';
import { parseNoteResult, parseTaskResult } from '../_lib/conv-parse';
import type { ContactDetail, ContactTask } from '../_lib/conv-types';

type Patch = (update: (previous: ContactDetail) => ContactDetail) => void;

/** Notas y tareas del contacto activo (panel derecho). Los cambios se aplican tras confirmar el servidor. */
export function useContactExtras(contactId: string | null, patch: Patch) {
  const addNote = useCallback(
    async (body: string): Promise<boolean> => {
      const text = body.trim();
      if (!text || !contactId) return false;
      const res = await sendJson('/api/notes', 'POST', { contactId, body: text });
      const note = res.ok ? parseNoteResult(res.data) : null;
      if (!note) {
        toast.error(res.ok ? 'Respuesta inesperada al guardar la nota.' : res.message);
        return false;
      }
      patch((previous) => ({ ...previous, notes: [note, ...previous.notes] }));
      return true;
    },
    [contactId, patch],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      const res = await sendJson(`/api/notes?id=${encodeURIComponent(id)}`, 'DELETE');
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      patch((previous) => ({ ...previous, notes: previous.notes.filter((n) => n.id !== id) }));
    },
    [patch],
  );

  const addTask = useCallback(
    async (title: string): Promise<boolean> => {
      const text = title.trim();
      if (!text || !contactId) return false;
      const res = await sendJson('/api/contact-tasks', 'POST', { contactId, title: text });
      const task = res.ok ? parseTaskResult(res.data) : null;
      if (!task) {
        toast.error(res.ok ? 'Respuesta inesperada al crear la tarea.' : res.message);
        return false;
      }
      patch((previous) => ({ ...previous, contactTasks: [task, ...previous.contactTasks] }));
      return true;
    },
    [contactId, patch],
  );

  const toggleTask = useCallback(
    async (task: ContactTask) => {
      const res = await sendJson('/api/contact-tasks', 'PATCH', { id: task.id, done: !task.done });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      patch((previous) => ({
        ...previous,
        contactTasks: previous.contactTasks.map((t) => (t.id === task.id ? { ...t, done: !task.done } : t)),
      }));
    },
    [patch],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const res = await sendJson(`/api/contact-tasks?id=${encodeURIComponent(id)}`, 'DELETE');
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      patch((previous) => ({ ...previous, contactTasks: previous.contactTasks.filter((t) => t.id !== id) }));
    },
    [patch],
  );

  return { addNote, deleteNote, addTask, toggleTask, deleteTask };
}
