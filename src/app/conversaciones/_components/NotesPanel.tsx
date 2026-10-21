import React from 'react';
import { Trash2 } from 'lucide-react';
import { QuickAdd } from './QuickAdd';
import { formatDateTime } from '../_lib/conv-model';
import type { Note } from '../_lib/conv-types';

interface NotesPanelProps {
  notes: Note[];
  empty: string;
  onAdd: (body: string) => Promise<boolean>;
  onDelete: (id: string) => void;
}

export function NotesPanel({ notes, empty, onAdd, onDelete }: NotesPanelProps) {
  return (
    <div className="cv-stack">
      <QuickAdd label="Nueva nota" placeholder="Escribir nota…" maxLength={2000} onAdd={onAdd} />
      {notes.length === 0 && <p className="cv-rail-empty">{empty}</p>}
      <ul className="cv-items">
        {notes.map((note) => (
          <li key={note.id} className="cv-item">
            <div className="cv-item-top">
              <time className="cv-item-meta" dateTime={note.createdAt}>{formatDateTime(note.createdAt)}</time>
              <button type="button" className="ghost cv-icon-btn cv-icon-btn--sm" aria-label="Eliminar nota" onClick={() => onDelete(note.id)}>
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </div>
            <p className="cv-item-text">{note.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
