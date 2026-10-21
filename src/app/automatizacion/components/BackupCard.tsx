'use client';

import React, { useRef, useState } from 'react';
import { AlertTriangle, Download, FileJson, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { backupFileName, buildBackup, parseBackup, planImport, type ImportPlanItem } from '@/lib/automation-backup';
import { errorMessage } from '../api';
import type { WorkflowT } from '../types';
import type { NewWorkflowInput } from '../use-automations';
import { Dialog } from './Dialog';

const PREVIEW_MAX = 8;

interface BackupCardProps {
  workflows: WorkflowT[];
  createWorkflow: (input: NewWorkflowInput) => Promise<unknown>;
}

export function BackupCard({ workflows, createWorkflow }: BackupCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [plan, setPlan] = useState<ImportPlanItem[] | null>(null);
  const real = workflows.filter((w) => !w.id.startsWith('tmp-'));

  function exportFlows() {
    const backup = buildBackup(real);
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName();
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${real.length} ${real.length === 1 ? 'flujo exportado' : 'flujos exportados'}.`);
  }

  async function readFile(file: File) {
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    setPlan(planImport(parsed.flows, real.map((w) => w.name)));
  }

  async function runImport(items: ImportPlanItem[]) {
    setPlan(null);
    setProgress({ done: 0, total: items.length });
    let created = 0;
    try {
      for (const { flow, finalName } of items) {
        await createWorkflow({ name: finalName, description: flow.description, trigger: flow.trigger, steps: flow.steps });
        created += 1;
        setProgress({ done: created, total: items.length });
      }
      toast.success(`${created} ${created === 1 ? 'flujo importado' : 'flujos importados'} como borrador.`);
    } catch (e: unknown) {
      toast.error(`Se importaron ${created} de ${items.length}. ${errorMessage(e)}`);
    } finally {
      setProgress(null);
    }
  }

  const sendingCount = plan?.filter((p) => p.sendsMessages).length ?? 0;
  const duplicateCount = plan?.filter((p) => p.duplicate).length ?? 0;

  return (
    <div className="au-st-card">
      <h3 className="st-card-title"><FileJson size={16} /> Respaldo de flujos</h3>
      <p className="st-card-text">
        Descarga tus flujos en un archivo JSON para guardarlos o llevarlos a otro espacio de trabajo. Antes de importar verás qué
        se va a crear; cada flujo entra como borrador y nada se ejecuta hasta que lo actives.
      </p>
      <div className="st-inline">
        <button type="button" className="au-btn au-btn--soft" onClick={exportFlows} disabled={real.length === 0}>
          <Download size={14} /> Exportar {real.length > 0 ? `(${real.length})` : ''}
        </button>
        <button type="button" className="au-btn" onClick={() => fileRef.current?.click()} disabled={progress !== null}>
          {progress ? <Loader2 size={14} className="au-spin" /> : <Upload size={14} />} Importar archivo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="st-hidden-input"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void readFile(file);
          }}
        />
      </div>
      {progress && <p className="st-progress" role="status">Importando {progress.done} de {progress.total}…</p>}
      {plan && (
        <Dialog
          title={`Importar ${plan.length} ${plan.length === 1 ? 'flujo' : 'flujos'}`}
          titleId="st-import-title"
          onClose={() => setPlan(null)}
          footer={(close) => (
            <>
              <button type="button" className="au-btn au-btn--ghost" onClick={close}>Cancelar</button>
              <button type="button" className="au-btn au-btn--primary" data-autofocus onClick={() => void runImport(plan)}>
                Importar como borrador
              </button>
            </>
          )}
        >
          <p className="ad-lead">Se crearán inactivos; podrás revisarlos uno a uno antes de activarlos.</p>
          {(sendingCount > 0 || duplicateCount > 0) && (
            <ul className="ad-list">
              {sendingCount > 0 && (
                <li className="is-warn"><AlertTriangle size={13} aria-hidden="true" /> {sendingCount === 1 ? '1 flujo envía' : `${sendingCount} flujos envían`} mensajes a clientes cuando lo actives.</li>
              )}
              {duplicateCount > 0 && (
                <li className="is-warn"><AlertTriangle size={13} aria-hidden="true" /> {duplicateCount === 1 ? '1 nombre ya existe' : `${duplicateCount} nombres ya existen`}: se añadirá «(importado)».</li>
              )}
            </ul>
          )}
          <ul className="st-import-list">
            {plan.slice(0, PREVIEW_MAX).map((item, i) => (
              <li key={i} className="st-import-item">
                <strong>{item.finalName}</strong>
                {item.sendsMessages && <span className="st-tag">Envía mensajes</span>}
              </li>
            ))}
            {plan.length > PREVIEW_MAX && <li className="st-import-item muted">y {plan.length - PREVIEW_MAX} más…</li>}
          </ul>
        </Dialog>
      )}
    </div>
  );
}
