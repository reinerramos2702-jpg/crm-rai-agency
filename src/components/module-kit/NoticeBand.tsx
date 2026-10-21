import React from 'react';
import { Info } from 'lucide-react';

interface NoticeBandProps {
  children: React.ReactNode;
  className?: string;
}

/** Banda informativa discreta (no interactiva): comunica el estado real de una sección. */
export function NoticeBand({ children, className = '' }: NoticeBandProps) {
  return (
    <p className={`mk-band ${className}`.trim()} role="note">
      <Info size={14} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
