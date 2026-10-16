'use client';

import React, { useRef, useState } from 'react';
import { Download, FileJson, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { backupFileName, buildBackup, parseBackup } from '@/lib/automation-backup';
import { errorMessage } from '../api';
import type { WorkflowT } from '../types';
import type { NewWorkflowInput } from '../use-automations';
import '../settings.css';

interface BackupCardProps {
  workflows: WorkflowT[];
  createWorkflow: (input: NewWorkflowInput) => Promise<unknown>;
}

export function BackupCard({ workflows, createWorkflow }: BackupCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
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

  async function importFile(file: File) {
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    setProgress({ done: 0, total: parsed.flows.length });
    let created = 0;
    try {
      for (const flow of parsed.flows) {
        await createWorkflow({ name: flow.name, description: flow.description, trigger: flow.trigger, steps: flow.steps });
        created += 1;
        setProgress({ done: created, total: parsed.flows.length });
      }
      toast.success(`${created} ${created === 1 ? 'flujo importado' : 'flujos importados'} como borrador.`);
    } catch (e: unknown) {
      toast.error(`Se importaron ${created} de ${parsed.flows.length}. ${errorMessage(e)}`);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="st-card">
      <h3 className="st-card-title"><FileJson size={16} /> Respaldo de flujos</h3>
      <p className="st-card-text">
        Descarga tus flujos en un archivo JSON para guardarlos o llevarlos a otro espacio de trabajo. Al importar, cada flujo
        se crea como borrador: nada se ejecuta hasta que lo actives.
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
            if (file) void importFile(file);
          }}
        />
      </div>
      {progress && <p className="st-progress" role="status">Importando {progress.done} de {progress.total}…</p>}
    </div>
  );
}
