import React from 'react';
import { Trash2 } from 'lucide-react';
import { QuickAdd } from './QuickAdd';
import type { ContactTask } from '../_lib/conv-types';

interface TasksPanelProps {
  tasks: ContactTask[];
  empty: string;
  onAdd: (title: string) => Promise<boolean>;
  onToggle: (task: ContactTask) => void;
  onDelete: (id: string) => void;
}

export function TasksPanel({ tasks, empty, onAdd, onToggle, onDelete }: TasksPanelProps) {
  return (
    <div className="cv-stack">
      <QuickAdd label="Nueva tarea" placeholder="Nueva tarea…" maxLength={200} onAdd={onAdd} />
      {tasks.length === 0 && <p className="cv-rail-empty">{empty}</p>}
      <ul className="cv-items">
        {tasks.map((task) => (
          <li key={task.id} className="cv-item cv-item--row">
            <label className="cv-check">
              <input type="checkbox" checked={task.done} onChange={() => onToggle(task)} />
              <span data-done={task.done || undefined}>{task.title}</span>
            </label>
            <button type="button" className="ghost cv-icon-btn cv-icon-btn--sm" aria-label={`Eliminar tarea: ${task.title}`} onClick={() => onDelete(task.id)}>
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
