'use client';

import React from 'react';
import Link from 'next/link';
import { Info, Sparkles, X } from 'lucide-react';
import type { AddRefResult } from '@/lib/media-local';
import type { MediaKind } from '@/lib/media-types';
import { BrandDocUpload } from './BrandDocUpload';
import { DialogShell } from './DialogShell';
import { LinkForm } from './LinkForm';

interface AddDialogProps {
  canUploadBrandDoc: boolean;
  onClose: () => void;
  onAddReference: (input: { url: string; title?: string; kind?: MediaKind }) => AddRefResult;
  /** Se llama tras subir el documento de marca para releer la biblioteca sin caché. */
  onBrandDocUploaded: () => Promise<void> | void;
}

/**
 * «Añadir a la biblioteca». No simula subidas: explica qué falta y ofrece solo
 * lo que funciona hoy (enlace como referencia local y documento de marca).
 */
export function AddDialog({ canUploadBrandDoc, onClose, onAddReference, onBrandDocUploaded }: AddDialogProps) {
  return (
    <DialogShell titleId="mm-add-title" onClose={onClose}>
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
        <div className="mm-note-body">
          <p><strong>La subida de archivos sueltos está pendiente.</strong></p>
          <p>
            Falta decidir dónde se guardan los archivos y cuánto espacio tiene cada plan. Hasta entonces no hay un
            botón de subida que no guardaría nada: puedes añadir enlaces y subir el documento de marca.
          </p>
        </div>
      </div>

      <LinkForm onAddReference={onAddReference} onDone={onClose} />
      <BrandDocUpload canUpload={canUploadBrandDoc} onUploaded={onBrandDocUploaded} onDone={onClose} />

      <section className="mm-section" aria-labelledby="mm-add-gen">
        <h3 id="mm-add-gen"><Sparkles size={14} aria-hidden="true" /> Crear imágenes nuevas</h3>
        <p className="muted">Lo que generes en una grilla aparece aquí automáticamente.</p>
        <div className="mm-form-actions">
          <Link href="/generador-imagenes" className="btn btn-secondary btn-sm" onClick={onClose}>
            Ir al Generador de imágenes
          </Link>
        </div>
      </section>
    </DialogShell>
  );
}
