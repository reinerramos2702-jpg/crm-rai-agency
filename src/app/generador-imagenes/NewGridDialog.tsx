'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileText, GraduationCap, Handshake, Megaphone, Rocket, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GRID_TEMPLATES, type GridTemplate } from '@/lib/grid-templates';
import { Spinner } from '@/components/ui/Spinner';

const ICONS: Record<GridTemplate['id'], LucideIcon> = {
  educativa: GraduationCap,
  venta: Megaphone,
  comunidad: Handshake,
  lanzamiento: Rocket,
};

interface NewGridDialogProps {
  open: boolean;
  creating: boolean;
  onClose: () => void;
  /** `null` crea una grilla en blanco. */
  onCreate: (templateId: GridTemplate['id'] | null) => void;
}

/** Selector de plantilla para una grilla nueva. Sin desenfoque de fondo (a diferencia de `Modal`). */
export function NewGridDialog({ open, creating, onClose, onCreate }: NewGridDialogProps) {
  const [selected, setSelected] = useState<GridTemplate['id'] | null>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creating) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, creating, onClose]);

  if (!open) return null;

  const template = GRID_TEMPLATES.find((t) => t.id === selected) ?? null;

  return (
    <div className="gi-dialog-backdrop" onClick={(e) => e.target === e.currentTarget && !creating && onClose()}>
      <div className="gi-dialog" role="dialog" aria-modal="true" aria-labelledby="gi-new-title">
        <div className="row-between gi-dialog-head">
          <div>
            <h2 id="gi-new-title">Nueva grilla</h2>
            <p className="muted">Empieza en blanco o precarga los 7 temas de la semana.</p>
          </div>
          <button type="button" className="btn-icon btn-sm" aria-label="Cerrar" onClick={onClose} disabled={creating}>
            <X size={16} />
          </button>
        </div>

        <div className="gi-templates" role="radiogroup" aria-label="Plantilla de grilla">
          <button
            ref={firstRef}
            type="button"
            role="radio"
            aria-checked={selected === null}
            className="gi-template"
            onClick={() => setSelected(null)}
          >
            <span className="gi-template-icon"><FileText size={18} /></span>
            <span className="gi-template-name">En blanco</span>
            <span className="gi-template-text">El asistente propone los temas en el Nodo 1.</span>
          </button>
          {GRID_TEMPLATES.map((t) => {
            const Icon = ICONS[t.id];
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected === t.id}
                className="gi-template"
                onClick={() => setSelected(t.id)}
              >
                <span className="gi-template-icon"><Icon size={18} /></span>
                <span className="gi-template-name">{t.name}</span>
                <span className="gi-template-text">{t.description}</span>
              </button>
            );
          })}
        </div>

        {template && (
          <ol className="gi-template-preview" aria-label={`Temas de ${template.name}`}>
            {template.themes.map((th, i) => (
              <li key={th.title}>
                <span className="gi-template-day">Día {i + 1}</span>
                <span>{th.title}</span>
                <span className="badge badge-muted">{th.category}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="row gi-dialog-foot">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={creating}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={() => onCreate(selected)} disabled={creating}>
            {creating && <Spinner size="sm" />}
            {template ? `Crear con «${template.name}»` : 'Crear grilla en blanco'}
          </button>
        </div>
      </div>
    </div>
  );
}
