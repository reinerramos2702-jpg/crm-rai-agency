'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FileText, Info, Link2, Sparkles, X } from 'lucide-react';
import { guessKind, type AddRefResult } from '@/lib/media-local';
import { KIND_SINGULAR, MEDIA_KINDS, type MediaKind } from '@/lib/media-types';
import { Spinner } from '@/components/ui/Spinner';
import { useDialog } from './use-dialog';

interface AddDialogProps {
  canUploadBrandDoc: boolean;
  onClose: () => void;
  onAddReference: (input: { url: string; title?: string; kind?: MediaKind }) => AddRefResult;
  /** Se llama tras subir el documento de marca para releer la biblioteca sin caché. */
  onBrandDocUploaded: () => Promise<void> | void;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * «Añadir a la biblioteca». No simula subidas: explica qué falta y ofrece solo
 * lo que funciona hoy (enlace como referencia local y documento de marca).
 */
export function AddDialog({ canUploadBrandDoc, onClose, onAddReference, onBrandDocUploaded }: AddDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<MediaKind>('image');
  const [kindTouched, setKindTouched] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useDialog(rootRef, onClose);

  function onUrlChange(value: string) {
    setUrl(value);
    setError('');
    if (!kindTouched) setKind(guessKind(value));
  }

  function submitLink(e: React.FormEvent) {
    e.preventDefault();
    const result = onAddReference({ url, title, kind });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success('Enlace guardado en este navegador.');
    setUrl('');
    setTitle('');
    setKindTouched(false);
    onClose();
  }

  async function uploadBrandDoc(file: File) {
    if (!file.name.toLowerCase().endsWith('.docx') && file.type !== DOCX_MIME) {
      toast.error('Solo se aceptan archivos .docx.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/workspace/brand-doc', { method: 'POST', body, credentials: 'same-origin' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success('Documento de marca actualizado.');
      await onBrandDocUploaded();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'No se pudo subir el documento.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="mm-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mm-dialog" role="dialog" aria-modal="true" aria-labelledby="mm-add-title" ref={rootRef} tabIndex={-1}>
        <div className="mm-dialog-head">
          <div>
            <h2 id="mm-add-title">Añadir a la biblioteca</h2>
            <p className="muted">Esto es lo que funciona hoy, sin simulaciones.</p>
          </div>
          <button type="button" className="btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="mm-note" role="note">
          <Info size={16} aria-hidden="true" />
          <div>
            <p><strong>Todavía no se pueden subir archivos sueltos.</strong></p>
            <p>
              El almacenamiento de archivos existe para lo que genera la IA, pero cada archivo queda atado a una
              grilla o a una tarea de campaña. No hay una tabla que guarde archivos subidos a mano por espacio de
              trabajo, y crearla requiere una migración que aún no se decidió. Por eso no se muestra un botón de
              subida que no guardaría nada.
            </p>
          </div>
        </div>

        <section className="mm-section" aria-labelledby="mm-add-link">
          <h3 id="mm-add-link"><Link2 size={14} aria-hidden="true" /> Importar por enlace (referencia)</h3>
          <p className="muted">
            Guarda el enlace de un archivo que ya está en internet. No se sube ni se copia: queda solo en este
            navegador y desaparece si borras los datos del sitio.
          </p>
          <form onSubmit={submitLink} className="mm-section" style={{ border: 0, padding: 0 }}>
            <div className="mm-form-row">
              <input
                className="input"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://…/imagen.png"
                aria-label="Enlace del archivo"
                aria-invalid={error !== ''}
                data-autofocus
                required
              />
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as MediaKind);
                  setKindTouched(true);
                }}
                aria-label="Tipo de archivo"
              >
                {MEDIA_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_SINGULAR[k]}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre (opcional)"
              aria-label="Nombre del archivo"
              maxLength={80}
            />
            {error && <p className="mm-error" role="alert">{error}</p>}
            <div className="mm-form-actions">
              <button type="submit" className="btn-primary btn-sm" disabled={!url.trim()}>
                Guardar enlace
              </button>
            </div>
          </form>
        </section>

        <section className="mm-section" aria-labelledby="mm-add-brand">
          <h3 id="mm-add-brand"><FileText size={14} aria-hidden="true" /> Subir documento de marca (.docx)</h3>
          <p className="muted">
            Se guarda en el servidor (como texto) y alimenta al Generador de imágenes. Reemplaza el documento anterior.
          </p>
          <div className="mm-form-actions">
            <input
              ref={fileRef}
              type="file"
              accept=".docx"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadBrandDoc(file);
              }}
            />
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={!canUploadBrandDoc || uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Spinner size="sm" /> : <FileText size={14} />} Elegir archivo .docx
            </button>
            {!canUploadBrandDoc && <span className="muted">Tu rol no puede modificar el documento de marca.</span>}
          </div>
        </section>

        <section className="mm-section" aria-labelledby="mm-add-gen">
          <h3 id="mm-add-gen"><Sparkles size={14} aria-hidden="true" /> Crear imágenes nuevas</h3>
          <p className="muted">Lo que generes en una grilla aparece aquí automáticamente.</p>
          <div className="mm-form-actions">
            <Link href="/generador-imagenes" className="btn btn-secondary btn-sm" onClick={onClose}>
              Ir al Generador de imágenes
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
