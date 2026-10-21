'use client';

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Upload } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { readApiError } from './browser-actions';

interface BrandDocUploadProps {
  canUpload: boolean;
  /** Se llama tras subir el documento para releer la biblioteca sin caché. */
  onUploaded: () => Promise<void> | void;
  onDone: () => void;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Documento de marca (.docx): lo único que hoy se sube de verdad al servidor. Admite arrastrar y soltar. */
export function BrandDocUpload({ canUpload, onUploaded, onDone }: BrandDocUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setError('');
    if (!file.name.toLowerCase().endsWith('.docx') && file.type !== DOCX_MIME) {
      setError('Solo se aceptan archivos .docx.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/workspace/brand-doc', { method: 'POST', body, credentials: 'same-origin' });
      if (!res.ok) throw new Error((await readApiError(res)) || `HTTP ${res.status}`);
      toast.success('Documento de marca actualizado.');
      await onUploaded();
      onDone();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo subir el documento.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const disabled = !canUpload || uploading;

  return (
    <section className="mm-section" aria-labelledby="mm-add-brand">
      <h3 id="mm-add-brand"><FileText size={14} aria-hidden="true" /> Subir documento de marca (.docx)</h3>
      <p className="muted">
        Se guarda en el servidor (como texto) y alimenta al Generador de imágenes. Reemplaza el documento anterior.
      </p>
      <div
        className={`mm-drop${dragging ? ' is-over' : ''}${disabled ? ' is-disabled' : ''}`}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file && !disabled) void upload(file);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".docx"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <button type="button" className="btn-secondary btn-sm" disabled={disabled} onClick={() => fileRef.current?.click()}>
          {uploading ? <Spinner size="sm" /> : <Upload size={14} />} {uploading ? 'Subiendo…' : 'Elegir archivo .docx'}
        </button>
        <span className="muted">
          {canUpload ? 'o suéltalo aquí' : 'Tu rol no puede modificar el documento de marca.'}
        </span>
      </div>
      {error && <p className="mm-error" role="alert">{error}</p>}
    </section>
  );
}
