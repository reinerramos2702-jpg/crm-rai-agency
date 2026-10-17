'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link2 } from 'lucide-react';
import { safeHttpUrl } from '@/lib/media-build';
import { guessKind, type AddRefResult } from '@/lib/media-local';
import { KIND_SINGULAR, MEDIA_KINDS, type MediaKind } from '@/lib/media-types';
import { KIND_ICONS } from './kind-icons';

const PREVIEW_DELAY_MS = 600;

interface LinkFormProps {
  onAddReference: (input: { url: string; title?: string; kind?: MediaKind }) => AddRefResult;
  onDone: () => void;
}

/** Importar por enlace: guarda una referencia local, con vista previa de la imagen antes de guardarla. */
export function LinkForm({ onAddReference, onDone }: LinkFormProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<MediaKind>('image');
  const [kindTouched, setKindTouched] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);

  const validUrl = safeHttpUrl(url);
  const showPreview = kind === 'image' && !!previewUrl && failedPreview !== previewUrl;

  // La vista previa espera a que termines de escribir: no pide imágenes de enlaces a medias.
  useEffect(() => {
    const timer = setTimeout(() => setPreviewUrl(validUrl), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [validUrl]);

  function onUrlChange(value: string) {
    setUrl(value);
    setError('');
    if (!kindTouched) setKind(guessKind(value));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = onAddReference({ url, title, kind });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success('Enlace guardado en este navegador.');
    onDone();
  }

  return (
    <section className="mm-section" aria-labelledby="mm-add-link">
      <h3 id="mm-add-link"><Link2 size={14} aria-hidden="true" /> Importar por enlace (referencia)</h3>
      <p className="muted">
        Guarda el enlace de un archivo que ya está en internet. No se sube ni se copia: queda solo en este
        navegador y desaparece si borras los datos del sitio.
      </p>
      <form onSubmit={submit} className="mm-link-form">
        <input
          className="input"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://…/imagen.png"
          aria-label="Enlace del archivo"
          aria-invalid={error !== ''}
          aria-describedby={error ? 'mm-link-error' : undefined}
          data-autofocus
          required
        />
        <div className="mm-radios" role="radiogroup" aria-label="Tipo de archivo">
          {MEDIA_KINDS.map((k) => {
            const Icon = KIND_ICONS[k];
            return (
              <label key={k} className="mm-radio">
                <input
                  type="radio"
                  name="mm-link-kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => {
                    setKind(k);
                    setKindTouched(true);
                  }}
                />
                <span>
                  <Icon size={14} aria-hidden="true" /> {KIND_SINGULAR[k]}
                </span>
              </label>
            );
          })}
        </div>
        <div className="mm-link-row">
          {showPreview && previewUrl && (
            <span className="mm-link-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Vista previa del enlace" referrerPolicy="no-referrer" onError={() => setFailedPreview(previewUrl)} />
            </span>
          )}
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre (opcional)"
            aria-label="Nombre del archivo"
            maxLength={80}
          />
        </div>
        {error && <p id="mm-link-error" className="mm-error" role="alert">{error}</p>}
        <div className="mm-form-actions">
          <button type="submit" className="btn-primary btn-sm" disabled={!url.trim()}>
            Guardar enlace
          </button>
        </div>
      </form>
    </section>
  );
}
