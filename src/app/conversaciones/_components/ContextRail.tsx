'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ContactCard } from './ContactCard';
import { InlineError } from './InlineError';
import { NotesPanel } from './NotesPanel';
import { RailTabs } from './RailTabs';
import { TasksPanel } from './TasksPanel';
import { railTab, type RailTabId } from './rail-config';
import type { useContactExtras } from '../_hooks/use-contact-extras';
import type { ContactDetail } from '../_lib/conv-types';

interface ContextRailProps {
  detail: ContactDetail | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  tab: RailTabId;
  onTab: (id: RailTabId) => void;
  extras: ReturnType<typeof useContactExtras>;
  onBack: () => void;
}

function PanelBody({ detail, tab, extras }: Pick<ContextRailProps, 'detail' | 'tab' | 'extras'>) {
  const def = railTab(tab);
  if (!detail) return <p className="cv-rail-empty">Selecciona un contacto para ver {def.label.toLowerCase()}.</p>;
  if (tab === 'notas') return <NotesPanel notes={detail.notes} empty={def.empty} onAdd={extras.addNote} onDelete={(id) => void extras.deleteNote(id)} />;
  if (tab === 'tareas') {
    return (
      <TasksPanel
        tasks={detail.contactTasks}
        empty={def.empty}
        onAdd={extras.addTask}
        onToggle={(task) => void extras.toggleTask(task)}
        onDelete={(id) => void extras.deleteTask(id)}
      />
    );
  }
  return <p className="cv-rail-empty">{def.empty}</p>;
}

/** Panel derecho: datos del contacto y paneles (notas, tareas, documentos…). */
export function ContextRail(props: ContextRailProps) {
  const def = railTab(props.tab);
  return (
    <aside className="cv-col cv-rail" aria-label="Contexto del contacto">
      <RailTabs active={props.tab} onChange={props.onTab} />
      <div className="cv-rail-main">
        <div className="cv-rail-head">
          <button type="button" className="ghost cv-icon-btn cv-back-rail" aria-label="Volver a la conversación" onClick={props.onBack}>
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
          <h2 className="cv-col-title">{def.label}</h2>
        </div>
        <div id="cv-rail-panel" className="cv-rail-panel" role="tabpanel" aria-labelledby={`cv-rail-tab-${props.tab}`} tabIndex={0}>
          {props.detail && <ContactCard detail={props.detail} />}
          {props.error && !props.detail ? (
            <InlineError title="No se pudo cargar el contacto" message={props.error} onRetry={props.onRetry} />
          ) : props.loading ? (
            <div className="cv-rail-skel" role="status" aria-busy="true">
              <span className="fx-sr-only">Cargando…</span>
              <span className="fx-shimmer cv-sk-line" aria-hidden="true" />
              <span className="fx-shimmer cv-sk-line" style={{ width: '70%' }} aria-hidden="true" />
            </div>
          ) : (
            <PanelBody detail={props.detail} tab={props.tab} extras={props.extras} />
          )}
        </div>
      </div>
    </aside>
  );
}
