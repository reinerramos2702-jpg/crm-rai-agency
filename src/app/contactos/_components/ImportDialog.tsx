'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FileUp } from 'lucide-react';
import { CrmDialog } from '../_shared/CrmDialog';
import { parseCsv } from '../_shared/crm-csv';
import { plural } from '../_shared/crm-text';
import { planImport, validateImportFile, type ImportPlan, type NewContact } from './import-model';

interface ImportDialogProps {
  onClose: () => void;
  onImport: (items: readonly NewContact[]) => Promise<{ done: number; failed: number }>;
}

export function ImportDialog({ onClose, onImport }: ImportDialogProps) {
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPlan(null);
    setFileError(null);
    if (!file) return;
    const problem = validateImportFile(file);
    if (problem) { setFileError(problem); return; }
    setFileName(file.name);
    try {
      setPlan(planImport(parseCsv(await file.text())));
    } catch {
      setFileError('No se pudo leer el archivo. Comprueba que sea un CSV válido.');
    }
  }

  async function run() {
    if (!plan || plan.valid.length === 0 || busy) return;
    setBusy(true);
    const { done, failed } = await onImport(plan.valid);
    setBusy(false);
    if (failed > 0) toast.error(`${plural(done, 'contacto importado', 'contactos importados')}; ${failed} fallaron.`);
    else toast.success(plural(done, 'contacto importado', 'contactos importados'));
    onClose();
  }

  const issues = plan?.issues ?? [];
  return (
    <CrmDialog
      title="Importar contactos"
      description="Sube un archivo CSV con las columnas Nombre, Correo y Teléfono (máx. 500 filas y 1 MB)."
      onClose={onClose}
      dismissible={!busy}
      icon={<FileUp size={18} />}
    >
      <div className="crm-dialog-form">
        <div className="crm-dropzone">
          <label htmlFor="imp-file"><strong>Elige un archivo .csv</strong></label>
          <input id="imp-file" className="input" type="file" accept=".csv,text/csv" data-autofocus="" disabled={busy} onChange={onFile} />
        </div>
        {fileError && <p className="crm-banner" role="alert"><span>{fileError}</span></p>}
        {plan?.fatal && <p className="crm-banner" role="alert"><span>{plan.fatal}</span></p>}
        {plan && !plan.fatal && (
          <div role="status">
            <p style={{ margin: '0 0 6px' }}>
              <strong>{fileName}</strong>: {plural(plan.valid.length, 'contacto listo', 'contactos listos')}
              {issues.length > 0 && ` y ${plural(issues.length, 'fila omitida', 'filas omitidas')}`}.
            </p>
            {issues.length > 0 && (
              <ul className="crm-import-list">
                {issues.slice(0, 5).map((i) => <li key={i.line}>Línea {i.line}: {i.reason}</li>)}
                {issues.length > 5 && <li>… y {issues.length - 5} más.</li>}
              </ul>
            )}
          </div>
        )}
        <div className="crm-form-actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="button" className="primary" disabled={busy || !plan || plan.valid.length === 0} onClick={run}>
            {busy ? 'Importando…' : plan && plan.valid.length > 0 ? `Importar ${plural(plan.valid.length, 'contacto', 'contactos')}` : 'Importar'}
          </button>
        </div>
      </div>
    </CrmDialog>
  );
}
