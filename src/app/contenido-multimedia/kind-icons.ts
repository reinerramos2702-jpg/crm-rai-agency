import { FileText, Image as ImageIcon, Music, Video, type LucideIcon } from 'lucide-react';
import type { MediaKind } from '@/lib/media-types';

export const KIND_ICONS: Record<MediaKind, LucideIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
};
