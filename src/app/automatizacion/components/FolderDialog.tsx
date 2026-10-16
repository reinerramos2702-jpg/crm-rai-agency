'use client';

import React, { useState } from 'react';
import { Dialog } from './Dialog';
import '../flows.css';

interface FolderDialogProps {
  onCreate: (name: string) => Promise<void>;
  onClose: () => void;
}

export function FolderDialog({ onCreate, onClose }: FolderDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (close: () => void) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre de la carpeta es requerido.');
      return;
    }
    close();
    void onCreate(trimmed);
  };

  return (
    <Dialog
      title="Nueva carpeta"
      titleId="fl-folder-title"
      size="sm"
      onClose={onClose}
      footer={(close) => (
        <>
          <button type="button" className="au-btn au-btn--ghost" onClick={close}>Cancelar</button>
          <button type="button" className="au-btn au-btn--primary" onClick={() => submit(close)}>Crear carpeta</button>
        </>
      )}
    >
      <label className="fl-dialog-label" htmlFor="fl-folder-name">Nombre</label>
      <input
        id="fl-folder-name"
        data-autofocus
        value={name}
        maxLength={60}
        placeholder="Ej. Mayoreo"
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit(onClose);
        }}
      />
      {error && <p className="au-note" role="alert" style={{ color: 'var(--rai-error)', marginTop: 8 }}>{error}</p>}
    </Dialog>
  );
}
