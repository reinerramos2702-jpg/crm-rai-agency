'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import type { LoadErrorCopy } from './error-copy';

interface RetryButtonProps {
  retrying: boolean;
  onRetry: () => void;
}

export function RetryButton({ retrying, onRetry }: RetryButtonProps) {
  return (
    <button type="button" className="btn-secondary btn-sm" onClick={onRetry} disabled={retrying}>
      {retrying ? <Spinner size="sm" /> : <RefreshCw size={14} aria-hidden="true" />}
      {retrying ? 'Reintentando…' : 'Reintentar'}
    </button>
  );
}

interface LoadNoticeProps extends RetryButtonProps {
  copy: LoadErrorCopy;
  /** Qué se está viendo mientras tanto (por ejemplo, «solo tus enlaces guardados»). */
  meanwhile: string;
}

/** Aviso en línea: la estructura de la biblioteca sigue visible y el fallo no la reemplaza. */
export function LoadNotice({ copy, meanwhile, retrying, onRetry }: LoadNoticeProps) {
  return (
    <div className="mm-note is-error" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <div className="mm-note-body">
        <p><strong>{copy.title}.</strong> {copy.text}</p>
        <p className="muted">{meanwhile}</p>
      </div>
      {copy.retryable && <RetryButton retrying={retrying} onRetry={onRetry} />}
    </div>
  );
}
