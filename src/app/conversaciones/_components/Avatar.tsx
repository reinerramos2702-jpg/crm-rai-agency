import React from 'react';
import { initials, toneIndex } from '../_lib/conv-model';

/** Avatar con iniciales y color estable según el nombre (decorativo: el nombre ya está en el texto vecino). */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  return (
    <span className={`cv-avatar cv-avatar--${size}`} data-tone={toneIndex(name)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
