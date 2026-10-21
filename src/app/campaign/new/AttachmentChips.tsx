'use client';

import { Archive, FileText, Film, Image as ImageIcon, Music, Paperclip, X, type LucideIcon } from 'lucide-react';
import { fileKind, formatSize, type FileKind } from '@/lib/campaign-chat';
import type { UploadedFile } from './hooks/useAttachments';

const KIND_ICON: Record<FileKind, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  archive: Archive,
  pdf: FileText,
  text: FileText,
  other: Paperclip,
};

interface AttachmentChipsProps {
  files: UploadedFile[];
  onRemove: (id: number) => void;
}

/** Adjuntos pendientes de enviar; los de texto muestran una barra de progreso mientras se leen. */
export function AttachmentChips({ files, onRemove }: AttachmentChipsProps) {
  if (files.length === 0) return null;
  return (
    <ul className="cn-att" aria-label="Archivos adjuntos">
      {files.map((f) => {
        const Icon = KIND_ICON[fileKind(f.type, f.name)];
        const reading = f.status === 'reading';
        return (
          <li key={f.id} className={`cn-att-chip${reading ? ' is-reading' : ''}`}>
            <Icon size={13} aria-hidden="true" />
            <span className="cn-att-name" title={f.name}>{f.name}</span>
            <span className="cn-att-size">{reading ? `${f.progress}%` : formatSize(f.sizeBytes)}</span>
            <button type="button" className="cn-att-x" onClick={() => onRemove(f.id)} aria-label={`Quitar ${f.name}`}>
              <X size={11} aria-hidden="true" />
            </button>
            {reading && (
              <span className="cn-att-bar" role="progressbar" aria-label={`Leyendo ${f.name}`} aria-valuenow={f.progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ transform: `scaleX(${f.progress / 100})` }} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
