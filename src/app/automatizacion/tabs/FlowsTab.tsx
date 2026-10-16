'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, Loader2, Plus, Search, SearchX, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { applyNameTemplate, sortFlows } from '@/lib/automation-prefs';
import { normalizeText } from '@/lib/automation-templates';
import { TRIGGER_META } from '@/lib/automations/ui-meta';
import { errorMessage } from '../api';
import { FlowRow } from '../components/FlowRow';
import { FolderDialog } from '../components/FolderDialog';
import { FolderPanel } from '../components/FolderPanel';
import type { WorkflowT } from '../types';
import { useAutomationPrefs } from '../use-automation-prefs';
import type { useAutomations } from '../use-automations';
import '../flows.css';

const BLANK_NAME = 'Nuevo flujo sin título';

interface FlowsTabProps {
  data: ReturnType<typeof useAutomations>;
  folderFilter: string;
  onFolderFilter: (id: string) => void;
  onGoTemplates: () => void;
}

function matches(flow: WorkflowT, query: string): boolean {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalizeText(`${flow.name} ${flow.description ?? ''} ${TRIGGER_META[flow.trigger?.type]?.label ?? ''}`);
  return terms.every((t) => haystack.includes(t));
}

export default function FlowsTab({ data, folderFilter, onFolderFilter, onGoTemplates }: FlowsTabProps) {
  const router = useRouter();
  const { prefs } = useAutomationPrefs();
  const { folders, workflows, loading, error, pendingIds } = data;
  const [query, setQuery] = useState('');
  const [folderDialog, setFolderDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedFolder = folders.find((f) => f.id === folderFilter);
  const visible = useMemo(() => {
    const inFolder = folderFilter === 'all' ? workflows : workflows.filter((w) => w.folderId === folderFilter);
    return sortFlows(inFolder.filter((w) => matches(w, query)), prefs.flowSort);
  }, [workflows, folderFilter, query, prefs.flowSort]);

  async function createBlank() {
    if (creating) return;
    setCreating(true);
    try {
      const wf = await data.createWorkflow({
        name: applyNameTemplate(prefs.nameTemplate, BLANK_NAME),
        folderId: folderFilter !== 'all' && !folderFilter.startsWith('tmp-') ? folderFilter : undefined,
        trigger: { type: 'contact.created', config: {} },
        steps: [],
      });
      router.push(`/automatizacion/${wf.id}`);
    } catch (e: unknown) {
      toast.error(errorMessage(e));
      setCreating(false);
    }
  }

  async function run(action: () => Promise<unknown>, success?: string) {
    try {
      await action();
      if (success) toast.success(success);
    } catch (e: unknown) {
      toast.error(errorMessage(e));
    }
  }

  const toggle = (flow: WorkflowT) =>
    run(async () => {
      const next = await data.toggleStatus(flow);
      toast.success(next === 'active' ? 'Flujo activado.' : 'Flujo pausado.');
    });

  const remove = (flow: WorkflowT) => {
    if (!confirm('¿Eliminar este flujo permanentemente? Se borrará su historial de ejecuciones.')) return;
    void run(() => data.removeWorkflow(flow), 'Flujo eliminado.');
  };

  const removeFolder = (folder: { id: string; name: string }) => {
    if (!confirm('¿Eliminar esta carpeta? Los flujos quedarán sin carpeta.')) return;
    if (folderFilter === folder.id) onFolderFilter('all');
    void run(() => data.removeFolder(folder), 'Carpeta eliminada.');
  };

  const createButton = (
    <button type="button" className="au-btn au-btn--primary" onClick={createBlank} disabled={creating}>
      {creating ? <Loader2 size={14} className="au-spin" /> : <Plus size={14} />} Nuevo flujo
    </button>
  );

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="fl-list" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="au-skel-row fl-skel">
            <SkeletonLine width={`${55 + (i % 3) * 12}%`} />
            <SkeletonLine width="35%" height={10} />
          </div>
        ))}
      </div>
    );
  } else if (error && workflows.length === 0) {
    body = (
      <div className="au-error" role="alert">
        No se pudieron cargar los flujos.
        <button type="button" className="au-btn au-btn--sm" onClick={() => void data.refresh()}>Reintentar</button>
      </div>
    );
  } else if (workflows.length === 0 || (visible.length === 0 && query === '')) {
    body = (
      <EmptyState
        icon={Zap}
        title={workflows.length === 0 ? 'Aún no tienes flujos' : 'Esta carpeta está vacía'}
        text="Un flujo es una regla: «cuando pasa X, haz Y». Empieza con una plantilla o crea uno desde cero."
        action={
          <>
            {createButton}
            <button type="button" className="au-btn au-btn--soft" onClick={onGoTemplates}>
              <LayoutTemplate size={14} /> Ver plantillas
            </button>
          </>
        }
      />
    );
  } else if (visible.length === 0) {
    body = (
      <EmptyState
        icon={SearchX}
        title="Sin resultados"
        text="Ningún flujo coincide con tu búsqueda."
        action={<button type="button" className="au-btn au-btn--soft" onClick={() => setQuery('')}>Limpiar búsqueda</button>}
      />
    );
  } else {
    body = (
      <ul className="fl-list">
        {visible.map((flow) => (
          <FlowRow
            key={flow.id}
            flow={flow}
            pending={pendingIds.has(flow.id)}
            showDescription={prefs.showDescriptions}
            zone={prefs.displayZone}
            onToggle={toggle}
            onDuplicate={(f) => void run(() => data.duplicateWorkflow(f), 'Flujo duplicado como borrador.')}
            onDelete={remove}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="fl-layout">
      <FolderPanel
        folders={folders}
        workflows={workflows}
        loading={loading}
        selected={folderFilter}
        onSelect={onFolderFilter}
        onNew={() => setFolderDialog(true)}
        onDelete={removeFolder}
      />
      <section data-tour="flows-list" aria-label="Lista de flujos">
        <div className="fl-list-head">
          <h2 className="fl-list-title">{folderFilter === 'all' ? 'Todos los flujos' : selectedFolder?.name ?? 'Flujos'}</h2>
          <div className="au-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar flujos…" aria-label="Buscar flujos" />
            {query && (
              <button type="button" className="au-search-clear" onClick={() => setQuery('')} aria-label="Borrar búsqueda">
                <X size={15} />
              </button>
            )}
          </div>
          {createButton}
        </div>
        {body}
      </section>
      {folderDialog && <FolderDialog onClose={() => setFolderDialog(false)} onCreate={(name) => run(() => data.createFolder(name), 'Carpeta creada.')} />}
    </div>
  );
}
