'use client';

import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Upload } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { SkeletonLine } from '@/components/ui/Skeleton';
import type { BrandDocInfo } from './types';
import { formatDate } from './utils';

interface BrandDocCardProps {
  /** `null` mientras carga. */
  brandDoc: BrandDocInfo | null;
  uploading: boolean;
  onUpload: (file: File) => void;
}

/** Tarjeta del documento de marca: acepta arrastrar y soltar un .docx o elegirlo con el botón. */
export function BrandDocCard({ brandDoc, uploading, onUpload }: BrandDocCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  }

  return (
    <div
      className={`card gi-brand${dragOver ? ' is-over' : ''}`}
      data-tour="gi-brand"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div className="row" style={{ gap: 14 }}>
          <div className="gi-brand-icon">
            <FileText size={20} color="var(--rai-gold)" />
          </div>
          <div>
            <div className="row" style={{ gap: 8 }}>
              <h3>Sistema Operativo de Contenido</h3>
              {brandDoc === null ? (
                <SkeletonLine width={84} height={20} />
              ) : brandDoc.hasBrandDoc ? (
                <span className="badge badge-success">
                  <CheckCircle2 size={11} /> Cargado
                </span>
              ) : (
                <span className="badge badge-warning">
                  <AlertTriangle size={11} /> Falta el documento
                </span>
              )}
            </div>
            {brandDoc === null ? (
              <div style={{ marginTop: 8 }}>
                <SkeletonLine width="min(420px, 100%)" height={13} />
              </div>
            ) : brandDoc.hasBrandDoc ? (
              <p className="muted" style={{ marginTop: 4 }}>
                {brandDoc.brandDocName}
                {brandDoc.brandDocUpdatedAt && ` · actualizado ${formatDate(brandDoc.brandDocUpdatedAt)}`}
                {' · '}
                {brandDoc.brandDocText?.length.toLocaleString('es')} caracteres
              </p>
            ) : (
              <div className="gi-brand-guide">
                <p className="muted">
                  Sin este documento el asistente usa buenas prácticas generales. Arrastra aquí tu .docx para que
                  siga tus reglas en cada nodo del wizard. Conviene que incluya:
                </p>
                <ul>
                  <li>Paleta y tipografía</li>
                  <li>Tono de voz</li>
                  <li>Estructura de slides</li>
                  <li>Reglas de copy y hashtags</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Spinner size="sm" /> : <Upload size={14} />}
            {brandDoc?.hasBrandDoc ? 'Reemplazar' : 'Subir .docx'}
          </button>
        </div>
      </div>
    </div>
  );
}
