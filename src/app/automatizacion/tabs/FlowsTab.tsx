'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LayoutTemplate, Loader2, Plus, Search, SearchX, Trash2, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { applyNameTemplate, sortFlows } from '@/lib/automation-prefs';
import { FLOW_STATUS_FILTERS, countFlowsByStatus, filterFlows, isNewFlowShortcut, type FlowStatusFilter } from '@/lib/automation-flows';
import { needsActivationConfirm } from '@/lib/automation-safety';
import { errorMessage } from '../api';
import { ActivationDialog } from '../components/ActivationDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FlowRow } from '../components/FlowRow';
import { FlowSkeleton } from '../components/FlowSkeleton';
import { FolderDialog } from '../components/FolderDialog';
import { FolderPanel } from '../components/FolderPanel';
import type { FolderT, WorkflowT } from '../types';
import { useAutomationPrefs } from '../use-automation-prefs';
import type { useAutomations } from '../use-automations';

const BLANK_NAME = 'Nuevo flujo sin título';

interface FlowsTabProps {
  data: ReturnType<typeof useAutomations>;
  folderFilter: string;
  onFolderFilter: (id: string) => void;
  onGoTemplates: () => void;
  /** `null` mientras se cargan los ajustes. */
  webhookConfigured: boolean | null;
}

export default function FlowsTab({ data, folderFilter, onFolderFilter, onGoTemplates, webhookConfigured }: FlowsTabProps) {
  const router = useRouter();
  const { prefs } = useAutomationPrefs();
  const { folders, workflows, loading, error, pendingIds } = data;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<FlowStatusFilter>('todos');
  const [folderDialog, setFolderDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmFlow, setConfirmFlow] = useState<WorkflowT | null>(null);
  const [deleteFlow, setDeleteFlow] = useState<WorkflowT | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderT | null>(null);

  const selectedFolder = folders.find((f) => f.id === folderFilter);
  const counts = useMemo(() => countFlowsByStatus(workflows, { query, folderId: folderFilter }), [workflows, query, folderFilter]);
  const visible = useMemo(
    () => sortFlows(filterFlows(workflows, { query, folderId: folderFilter, status }), prefs.flowSort),
    [workflows, query, folderFilter, status, prefs.flowSort]
  );
  const filtering = query.trim() !== '' || status !== 'todos';

  const createBlank = useCallback(async () => {
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
  }, [creating, data, folderFilter, prefs.nameTemplate, router]);

  // Atajo «N»: flujo nuevo (nunca mientras se escribe ni con un diálogo abierto).
  const dialogOpen = folderDialog || confirmFlow !== null || deleteFlow !== null || deleteFolder !== null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isNewFlowShortcut(e, e.target, dialogOpen || !!document.querySelector('[aria-modal="true"]'))) return;
      e.preventDefault();
      void createBlank();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [createBlank, dialogOpen]);

  async function run(action: () => Promise<unknown>, success?: string) {
    try {
      await action();
      if (success) toast.success(success);
    } catch (e: unknown) {
      toast.error(errorMessage(e));
    }
  }

  const doToggle = (flow: WorkflowT) =>
    run(async () => {
      const next = await data.toggleStatus(flow);
      toast.success(next === 'active' ? 'Flujo activado.' : 'Flujo pausado.');
    });

  const toggle = (flow: WorkflowT) => {
    if (prefs.confirmSend && needsActivationConfirm(flow)) setConfirmFlow(flow);
    else void doToggle(flow);
  };

  const confirmRemoveFlow = () => {
    const flow = deleteFlow;
    setDeleteFlow(null);
    if (flow) void run(() => data.removeWorkflow(flow), 'Flujo eliminado.');
  };

  const confirmRemoveFolder = () => {
    const folder = deleteFolder;
    setDeleteFolder(null);
    if (!folder) return;
    if (folderFilter === folder.id) onFolderFilter('all');
    void run(() => data.removeFolder(folder), 'Carpeta eliminada.');
  };

  const createButton = (
    <button type="button" className="au-btn au-btn--primary" onClick={() => void createBlank()} disabled={creating} title="Atajo: N">
      {creating ? <Loader2 size={14} className="au-spin" /> : <Plus size={14} />} Nuevo flujo <kbd className="fl-kbd" aria-hidden="true">N</kbd>
    </button>
  );
  const clearFilters = () => {
    setQuery('');
    setStatus('todos');
  };

  let body: React.ReactNode;
  if (loading) {
    body = <FlowSkeleton />;
  } else if (error && workflows.length === 0) {
    body = (
      <div className="au-error" role="alert">
        No se pudieron cargar los flujos.
        <button type="button" className="au-btn au-btn--sm" onClick={() => void data.refresh()}>Reintentar</button>
      </div>
    );
  } else if (workflows.length === 0 || (visible.length === 0 && !filtering)) {
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
        text="Ningún flujo coincide con la búsqueda y el estado elegidos."
        action={<button type="button" className="au-btn au-btn--soft" onClick={clearFilters}>Limpiar filtros</button>}
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
            compact={prefs.density === 'compact'}
            onToggle={toggle}
            onDuplicate={(f) => void run(() => data.duplicateWorkflow(f), 'Flujo duplicado como borrador.')}
            onDelete={setDeleteFlow}
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
        onDelete={setDeleteFolder}
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
        {error && workflows.length > 0 && (
          <div className="fl-banner" role="alert">
            <AlertTriangle size={16} aria-hidden="true" style={{ color: 'var(--rai-warning)' }} />
            <span>No se pudo actualizar la lista; ves la última versión conocida.</span>
            <button type="button" className="au-btn au-btn--sm" onClick={() => void data.refresh()}>Reintentar</button>
          </div>
        )}
        {!loading && workflows.length > 0 && (
          <div className="fl-filters">
            <div className="au-chips" role="group" aria-label="Filtrar por estado">
              {FLOW_STATUS_FILTERS.map((f) => (
                <button key={f.id} type="button" className="au-chip" aria-pressed={status === f.id} onClick={() => setStatus(f.id)}>
                  {f.label} <span className="au-chip-n">{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {body}
      </section>
      {folderDialog && <FolderDialog onClose={() => setFolderDialog(false)} onCreate={(name) => run(() => data.createFolder(name), 'Carpeta creada.')} />}
      {deleteFlow && (
        <ConfirmDialog
          title="¿Eliminar este flujo?"
          titleId="fl-delete-flow"
          confirmLabel="Eliminar flujo"
          danger
          icon={<span className="tp-icon" aria-hidden="true"><Trash2 size={18} /></span>}
          onCancel={() => setDeleteFlow(null)}
          onConfirm={confirmRemoveFlow}
        >
          <p className="ad-lead"><strong>{deleteFlow.name}</strong> se borrará de forma permanente junto con su historial de ejecuciones. No se puede deshacer.</p>
        </ConfirmDialog>
      )}
      {deleteFolder && (
        <ConfirmDialog
          title="¿Eliminar esta carpeta?"
          titleId="fl-delete-folder"
          confirmLabel="Eliminar carpeta"
          danger
          onCancel={() => setDeleteFolder(null)}
          onConfirm={confirmRemoveFolder}
        >
          <p className="ad-lead">La carpeta <strong>{deleteFolder.name}</strong> se eliminará. Los flujos que contiene no se borran: quedarán sin carpeta.</p>
        </ConfirmDialog>
      )}
      {confirmFlow && (
        <ActivationDialog
          flow={confirmFlow}
          webhookConfigured={webhookConfigured}
          onCancel={() => setConfirmFlow(null)}
          onConfirm={() => {
            const flow = confirmFlow;
            setConfirmFlow(null);
            void doToggle(flow);
          }}
        />
      )}
    </div>
  );
}
