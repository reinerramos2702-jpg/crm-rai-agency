import React from 'react';
import { Image as ImageIcon, LayoutGrid, Video } from 'lucide-react';
import type { ContentType } from './types';

/** Icono decorativo del tipo de pieza (el texto del tipo siempre acompaña o se anuncia aparte). */
export function ContentTypeIcon({ type, size = 14 }: { type: ContentType; size?: number }) {
  if (type === 'carousel') return <LayoutGrid size={size} aria-hidden="true" />;
  if (type === 'reel') return <Video size={size} aria-hidden="true" />;
  return <ImageIcon size={size} aria-hidden="true" />;
}
