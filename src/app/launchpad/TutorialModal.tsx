import React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, PlayCircle, X } from 'lucide-react';

interface TutorialModalProps {
  stepId: string;
  title: string;
  slideCount: number;
  slideIndex: number;
  onSlide: (index: number) => void;
  onClose: () => void;
}

/** Tutorial paso a paso (diapositivas SVG de /public/tutorials). */
export function TutorialModal({ stepId, title, slideCount, slideIndex, onSlide, onClose }: TutorialModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} role="dialog" aria-modal="true" aria-label={`Tutorial: ${title}`} onClick={(e) => e.stopPropagation()}>
        <div className="row-between mb-4">
          <div>
            <h3>{title}</h3>
            <p className="muted" style={{ fontSize: 12 }}>Tutorial paso a paso</p>
          </div>
          <button className="ghost btn-sm" onClick={onClose} aria-label="Cerrar tutorial">
            <X size={16} />
          </button>
        </div>

        {slideCount > 0 ? (
          <>
            <div className="lp-slide-frame">
              <Image
                src={`/tutorials/${stepId}/slide-${slideIndex + 1}.svg`}
                alt={`${title} — paso ${slideIndex + 1}`}
                width={1280}
                height={720}
                sizes="(max-width: 720px) calc(100vw - 64px), 672px"
                style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block' }}
              />
            </div>
            <div className="row-between mt-4">
              <button className="ghost btn-sm" disabled={slideIndex === 0} onClick={() => onSlide(Math.max(0, slideIndex - 1))}>
                <ChevronLeft size={14} />
                Anterior
              </button>
              <span className="muted" style={{ fontSize: 12 }}>Paso {slideIndex + 1} de {slideCount}</span>
              <button className="ghost btn-sm" disabled={slideIndex >= slideCount - 1} onClick={() => onSlide(Math.min(slideCount - 1, slideIndex + 1))}>
                Siguiente
                <ChevronRight size={14} />
              </button>
            </div>
          </>
        ) : (
          <div className="lp-slide-frame lp-slide-empty">
            <PlayCircle size={32} color="var(--rai-muted)" />
            <p className="muted mt-2" style={{ fontSize: 13, textAlign: 'center' }}>
              El tutorial de este paso está en preparación.
              <br />
              Pronto encontrarás aquí una guía visual.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
