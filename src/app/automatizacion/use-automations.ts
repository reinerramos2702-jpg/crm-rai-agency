'use client';

import { useCallback, useState } from 'react';
import { useCachedJson } from '@/lib/use-cached-json';
import { requestJson, updateCached } from './api';
import { AUTOMATIONS_URL, type AutomationsPayload, type FolderT, type WorkflowT } from './types';

interface WorkflowResponse {
  workflow: WorkflowT;
}

export interface NewWorkflowInput {
  name?: string;
  description?: string | null;
  folderId?: string | null;
  templateId?: string;
  trigger?: WorkflowT['trigger'];
  steps?: WorkflowT['steps'];
}

const patch = (fn: (current: AutomationsPayload) => AutomationsPayload) => updateCached<AutomationsPayload>(AUTOMATIONS_URL, fn);

/**
 * Carpetas y flujos con caché SWR. Las mutaciones se reflejan al instante en pantalla
 * y se deshacen solas si el servidor las rechaza (el error se propaga a quien llama).
 */
export function useAutomations() {
  const { data, error, loading, revalidating, refresh } = useCachedJson<AutomationsPayload>(AUTOMATIONS_URL, { ttlMs: 10_000 });
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  const setPending = useCallback((id: string, on: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const createWorkflow = useCallback(async (input: NewWorkflowInput): Promise<WorkflowT> => {
    const { workflow } = await requestJson<WorkflowResponse>(AUTOMATIONS_URL, 'POST', input);
    patch((p) => ({ ...p, workflows: [workflow, ...p.workflows] }));
    return workflow;
  }, []);

  const duplicateWorkflow = useCallback(
    async (wf: WorkflowT) => {
      const tempId = `tmp-${wf.id}-${Date.now()}`;
      const draft: WorkflowT = { ...wf, id: tempId, name: `${wf.name} (copia)`, status: 'draft', runsCount: 0, lastRunAt: null, _count: { runs: 0 } };
      patch((p) => ({ ...p, workflows: [draft, ...p.workflows] }));
      setPending(tempId, true);
      try {
        const { workflow } = await requestJson<WorkflowResponse>(AUTOMATIONS_URL, 'POST', {
          name: draft.name,
          description: wf.description,
          folderId: wf.folderId,
          trigger: wf.trigger,
          steps: wf.steps,
        });
        patch((p) => ({ ...p, workflows: p.workflows.map((w) => (w.id === tempId ? workflow : w)) }));
      } catch (e) {
        patch((p) => ({ ...p, workflows: p.workflows.filter((w) => w.id !== tempId) }));
        throw e;
      } finally {
        setPending(tempId, false);
      }
    },
    [setPending]
  );

  const toggleStatus = useCallback(
    async (wf: WorkflowT): Promise<'active' | 'paused'> => {
      const next = wf.status === 'active' ? 'paused' : 'active';
      const setStatus = (status: string) => patch((p) => ({ ...p, workflows: p.workflows.map((w) => (w.id === wf.id ? { ...w, status } : w)) }));
      setStatus(next);
      setPending(wf.id, true);
      try {
        await requestJson(`${AUTOMATIONS_URL}/${wf.id}`, 'PATCH', { status: next });
        return next;
      } catch (e) {
        setStatus(wf.status);
        throw e;
      } finally {
        setPending(wf.id, false);
      }
    },
    [setPending]
  );

  const removeWorkflow = useCallback(
    async (wf: WorkflowT) => {
      patch((p) => ({ ...p, workflows: p.workflows.filter((w) => w.id !== wf.id) }));
      try {
        await requestJson(`${AUTOMATIONS_URL}/${wf.id}`, 'DELETE');
      } catch (e) {
        patch((p) => ({ ...p, workflows: [wf, ...p.workflows] }));
        throw e;
      }
    },
    []
  );

  const createFolder = useCallback(async (name: string) => {
    const tempId = `tmp-folder-${Date.now()}`;
    patch((p) => ({ ...p, folders: [...p.folders, { id: tempId, name }] }));
    try {
      const res = await requestJson<{ folder?: FolderT }>(`${AUTOMATIONS_URL}/folders`, 'POST', { name });
      const folder = res.folder;
      if (folder) patch((p) => ({ ...p, folders: p.folders.map((f) => (f.id === tempId ? folder : f)) }));
      else void refresh();
    } catch (e) {
      patch((p) => ({ ...p, folders: p.folders.filter((f) => f.id !== tempId) }));
      throw e;
    }
  }, [refresh]);

  const removeFolder = useCallback(async (folder: FolderT) => {
    patch((p) => ({
      ...p,
      folders: p.folders.filter((f) => f.id !== folder.id),
      workflows: p.workflows.map((w) => (w.folderId === folder.id ? { ...w, folderId: null } : w)),
    }));
    try {
      await requestJson(`${AUTOMATIONS_URL}/folders?id=${folder.id}`, 'DELETE');
    } catch (e) {
      void refresh();
      throw e;
    }
  }, [refresh]);

  return {
    folders: data?.folders ?? [],
    workflows: data?.workflows ?? [],
    loading,
    error,
    revalidating,
    pendingIds,
    refresh,
    createWorkflow,
    duplicateWorkflow,
    toggleStatus,
    removeWorkflow,
    createFolder,
    removeFolder,
  };
}
