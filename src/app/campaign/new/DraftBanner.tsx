'use client';

import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatDraftAge } from '@/lib/draft-storage';

interface DraftBannerProps {
  /** Momento en que se guardó el borrador recuperado. */
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

/** Aviso discreto al volver con un borrador pendiente: nunca restaura sin confirmación. */
export function DraftBanner({ savedAt, onRestore, onDiscard }: DraftBannerProps) {
  const age = useMemo(() => formatDraftAge(savedAt), [savedAt]);

  return (
    <div className="cn-draft-bar fx-field-in" role="region" aria-label="Borrador recuperado">
      <p className="cn-draft-text">
        <RotateCcw size={14} aria-hidden="true" />
        <span>
          Recuperamos tu borrador de hace <strong>{age}</strong>.
        </span>
      </p>
      <div className="cn-draft-actions">
        <button type="button" className="cn-draft-btn cn-draft-btn--main" onClick={onRestore}>
          Restaurar
        </button>
        <button type="button" className="cn-draft-btn" onClick={onDiscard}>
          Descartar
        </button>
      </div>
    </div>
  );
}
