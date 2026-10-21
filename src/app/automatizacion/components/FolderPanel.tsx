'use client';

import React from 'react';
import { Folder, FolderPlus, Layers, Trash2 } from 'lucide-react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import type { FolderT, WorkflowT } from '../types';

interface FolderPanelProps {
  folders: FolderT[];
  workflows: WorkflowT[];
  loading: boolean;
  selected: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (folder: FolderT) => void;
}

export function FolderPanel({ folders, workflows, loading, selected, onSelect, onNew, onDelete }: FolderPanelProps) {
  const counts = new Map<string, number>();
  for (const wf of workflows) {
    if (wf.folderId) counts.set(wf.folderId, (counts.get(wf.folderId) ?? 0) + 1);
  }

  return (
    <aside className="fl-panel" data-tour="flows-folders" aria-label="Carpetas">
      <div className="fl-panel-head">
        <h2 className="fl-panel-title">Carpetas</h2>
        <button type="button" className="au-btn au-btn--soft au-btn--sm" onClick={onNew}>
          <FolderPlus size={14} /> Nueva
        </button>
      </div>
      {loading ? (
        <div className="fl-skel-folders" aria-busy="true">
          <SkeletonLine height={36} />
          <SkeletonLine height={36} width="80%" />
        </div>
      ) : (
        <>
          <ul className="fl-folders">
            <li className="fl-folder">
              <button type="button" className="fl-folder-btn" aria-current={selected === 'all'} onClick={() => onSelect('all')}>
                <Layers size={14} />
                <span>Todos los flujos</span>
                <span className="fl-folder-n">{workflows.length}</span>
              </button>
            </li>
            {folders.map((folder) => (
              <li key={folder.id} className="fl-folder fx-reveal">
                <button type="button" className="fl-folder-btn" aria-current={selected === folder.id} onClick={() => onSelect(folder.id)}>
                  <Folder size={14} />
                  <span>{folder.name}</span>
                  <span className="fl-folder-n">{counts.get(folder.id) ?? 0}</span>
                </button>
                <span className="fl-folder-actions fx-reveal-actions">
                  <button
                    type="button"
                    className="au-btn au-btn--ghost au-btn--icon au-btn--sm"
                    onClick={() => onDelete(folder)}
                    aria-label={`Eliminar la carpeta ${folder.name}`}
                    disabled={folder.id.startsWith('tmp-')}
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {folders.length === 0 && (
            <p className="fl-folder-empty">Crea una carpeta para ordenar tus flujos por área (servicios, retail, mayoreo…).</p>
          )}
        </>
      )}
    </aside>
  );
}
