'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { TRIGGER_META } from '@/lib/automations/ui-meta';
import type { StepType, TriggerType, WorkflowStep } from '@/lib/automations/types';
import { useCachedJson } from '@/lib/use-cached-json';
import { errorMessage, requestJson, updateCached } from '../api';
import { AUTOMATIONS_URL, type AutomationsPayload } from '../types';
import { parseWorkflowDetail } from './parse-detail';
import { defaultsForFields, newStep, type ConfigMap } from './step-model';
import type { DetailRun, LoadState } from './types';

interface Snapshot {
  name: string;
  description: string;
  folderId: string;
  triggerType: TriggerType;
  triggerConfig: ConfigMap;
  steps: WorkflowStep[];
}

const snapshotKey = (s: Snapshot) => JSON.stringify(s);

/**
 * Estado del editor de un flujo: carga, edición local, guardado, activar/pausar y aviso de cambios sin guardar.
 * Las carpetas salen de GET /api/automations (la ruta /folders solo admite POST y DELETE).
 */
export function useWorkflowEditor(id: string | undefined) {
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });
  const [saving, setSaving] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [status, setStatus] = useState('draft');
  const [runs, setRuns] = useState<DetailRun[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('contact.created');
  const [triggerConfig, setTriggerConfig] = useState<ConfigMap>({});
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [saved, setSaved] = useState<string>('');
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const { data: listData } = useCachedJson<AutomationsPayload>(AUTOMATIONS_URL, { ttlMs: 30_000 });
  const folders = listData?.folders ?? [];

  const current: Snapshot = useMemo(
    () => ({ name, description, folderId, triggerType, triggerConfig, steps }),
    [name, description, folderId, triggerType, triggerConfig, steps]
  );
  const dirty = load.kind === 'ready' && snapshotKey(current) !== saved;

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoad({ kind: 'loading' });
    try {
      const res = await fetch(`/api/automations/${id}`);
      if (res.status === 404) {
        setLoad({ kind: 'notfound' });
        return;
      }
      if (!res.ok) {
        setLoad({ kind: 'error', message: `Error del servidor (${res.status}).` });
        return;
      }
      const wf = parseWorkflowDetail(await res.json());
      if (!wf) {
        setLoad({ kind: 'error', message: 'La respuesta del servidor no tiene el formato esperado.' });
        return;
      }
      setName(wf.name);
      setDescription(wf.description ?? '');
      setFolderId(wf.folderId ?? '');
      setStatus(wf.status);
      setTriggerType(wf.trigger.type);
      setTriggerConfig(wf.trigger.config);
      setSteps(wf.steps);
      setRuns(wf.runs);
      setSaved(snapshotKey({
        name: wf.name,
        description: wf.description ?? '',
        folderId: wf.folderId ?? '',
        triggerType: wf.trigger.type,
        triggerConfig: wf.trigger.config,
        steps: wf.steps,
      }));
      setLoad({ kind: 'ready' });
    } catch {
      setLoad({ kind: 'error', message: 'Error de red: no se pudo contactar al servidor.' });
    }
  }, [id]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Aviso del navegador si se intenta salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const changeTriggerType = useCallback((type: TriggerType) => {
    setTriggerType(type);
    setTriggerConfig(defaultsForFields(TRIGGER_META[type].fields));
  }, []);

  const setTriggerField = useCallback((key: string, value: string | number) => {
    setTriggerConfig((c) => ({ ...c, [key]: value }));
  }, []);

  const addStep = useCallback((type: StepType) => {
    const step = newStep(type);
    setSteps((prev) => [...prev, step]);
    setLastAdded(step.id);
  }, []);

  const updateStep = useCallback((index: number, step: WorkflowStep) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? step : s)));
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveStep = useCallback((index: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const clearLastAdded = useCallback(() => setLastAdded(null), []);

  const syncList = useCallback((patch: { name?: string; description?: string | null; folderId?: string | null; status?: string; trigger?: { type: TriggerType; config: ConfigMap }; steps?: WorkflowStep[] }) => {
    if (!id) return;
    updateCached<AutomationsPayload>(AUTOMATIONS_URL, (p) => ({
      ...p,
      workflows: p.workflows.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));
  }, [id]);

  const save = useCallback(async (showToast = true): Promise<boolean> => {
    if (!name.trim()) {
      toast.error('El nombre del flujo es requerido.');
      return false;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        folderId: folderId || null,
        trigger: { type: triggerType, config: triggerConfig },
        steps,
      };
      await requestJson(`${AUTOMATIONS_URL}/${id}`, 'PATCH', body);
      setSaved(snapshotKey(current));
      syncList({ name: body.name, description: body.description, folderId: body.folderId, trigger: body.trigger, steps });
      if (showToast) toast.success('Flujo guardado.');
      return true;
    } catch (e: unknown) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  }, [name, description, folderId, triggerType, triggerConfig, steps, id, current, syncList]);

  /** Guarda los cambios pendientes y luego cambia el estado (activar o pausar). */
  const toggleActive = useCallback(async () => {
    if (!(await save(false))) return;
    const next = status === 'active' ? 'paused' : 'active';
    setBusyStatus(true);
    try {
      await requestJson(`${AUTOMATIONS_URL}/${id}`, 'PATCH', { status: next });
      setStatus(next);
      syncList({ status: next });
      toast.success(next === 'active' ? 'Flujo activado y guardado.' : 'Flujo pausado.');
    } catch (e: unknown) {
      toast.error(errorMessage(e));
    } finally {
      setBusyStatus(false);
    }
  }, [save, status, id, syncList]);

  return {
    load, reload: fetchAll, folders,
    name, setName, description, setDescription, folderId, setFolderId,
    status, runs, triggerType, triggerConfig, steps,
    changeTriggerType, setTriggerField, addStep, updateStep, removeStep, moveStep,
    lastAdded, clearLastAdded,
    dirty, saving, busyStatus, save, toggleActive,
  };
}

export type WorkflowEditor = ReturnType<typeof useWorkflowEditor>;
