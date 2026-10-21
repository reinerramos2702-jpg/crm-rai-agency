'use client';

import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/ui/Spinner';
import { SLIDES_TARGET } from '@/lib/grid-progress';
import { imageFileName } from '@/lib/grid-export';
import type { Asset } from '../types';
import { downloadImage } from '../utils';
import { SLIDE_SLOTS } from './constants';

interface StudioPanelProps {
  gridName: string;
  /** Índice (0-6) del día que se está trabajando. */
  day: number;
  dayTitle: string;
  assets: Asset[];
  generating: boolean;
  /** Devuelve true si la imagen se generó. */
  onGenerate: (slideNumber: number, prompt: string) => Promise<boolean>;
}

/** Estudio de imágenes de un día: una casilla por slide, con generar, regenerar y descargar. */
export function StudioPanel({ gridName, day, dayTitle, assets, generating, onGenerate }: StudioPanelProps) {
  const [slide, setSlide] = useState(1);
  const [prompt, setPrompt] = useState('');

  // Al cambiar de día se parte de cero: el prompt de otro día no aplica.
  useEffect(() => {
    setSlide(1);
    setPrompt('');
  }, [day]);

  const bySlide = new Map(assets.map((a) => [a.slideNumber, a]));
  const current = bySlide.get(slide);

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error('Escribe el prompt de imagen para este slide');
      return;
    }
    await onGenerate(slide, prompt.trim());
  }

  async function handleDownload(asset: Asset) {
    const how = await downloadImage(asset.publicUrl, imageFileName(gridName, asset.themeIndex, asset.slideNumber));
    if (how === 'opened') toast('Se abrió la imagen en otra pestaña: guárdala desde allí.');
  }

  return (
    <div className="gw-studio">
      <p className="label gw-label">
        Día {day + 1}{dayTitle ? ` · ${dayTitle}` : ''}
      </p>

      <ul className="gw-slots" aria-label="Slides del carrusel">
        {SLIDE_SLOTS.map((n) => {
          const asset = bySlide.get(n);
          const selected = n === slide;
          return (
            <li key={n} className="gw-slot-wrap">
              <button
                type="button"
                className={`gw-slot${selected ? ' is-selected' : ''}${asset ? ' has-image' : ''}`}
                aria-pressed={selected}
                aria-label={asset ? `Slide ${n}, con imagen` : `Slide ${n}, sin imagen`}
                onClick={() => {
                  setSlide(n);
                  if (asset?.prompt) setPrompt(asset.prompt);
                }}
              >
                {asset ? (
                  // Las URLs de assets son dinámicas (R2, data o blob): no pasan por el optimizador de Next.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.publicUrl}
                    alt={`Día ${day + 1}, slide ${n}`}
                    width={240}
                    height={300}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="gw-slot-empty">{n > SLIDES_TARGET ? 'Opcional' : 'Sin imagen'}</span>
                )}
                <span className="gw-slot-n">{n}</span>
              </button>
              {asset && (
                <button
                  type="button"
                  className="btn-icon btn-sm gw-slot-dl"
                  title="Descargar esta imagen"
                  aria-label={`Descargar el slide ${n}`}
                  onClick={() => void handleDownload(asset)}
                >
                  <Download size={13} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="form-group">
        <label htmlFor="gw-prompt">Prompt del slide {slide}</label>
        <textarea
          id="gw-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Pega aquí el prompt detallado que te dio el asistente para este slide…"
          rows={5}
        />
      </div>

      <div className="gw-studio-actions">
        <button className="btn-primary" onClick={() => void handleGenerate()} disabled={generating}>
          {generating ? <Spinner size="sm" /> : current ? <RefreshCw size={16} /> : <Wand2 size={16} />}
          {current ? `Regenerar slide ${slide}` : `Generar slide ${slide}`}
        </button>
      </div>
      {current && (
        <p className="muted gw-studio-note">
          Regenerar reemplaza la imagen actual de este slide.
        </p>
      )}
    </div>
  );
}
