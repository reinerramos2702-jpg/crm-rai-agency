import type { ScheduledPostView } from '../useScheduledPosts';
import type { ChatMessage, ContentType, DayStatus } from './types';

export const TOUR_KEY = 'rai-tour-ig-v1';
export const STORAGE_PREFIX = 'rai-ig-';

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  carousel: 'Carrusel',
  reel: 'Reel',
  post: 'Post',
};

export const DAY_STATUS_ORDER: DayStatus[] = ['published', 'approved', 'generated', 'pending'];

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  pending: 'Pendiente',
  generated: 'Generado',
  approved: 'Aprobado',
  published: 'Publicado',
  failed: 'Fallido',
};

export const DAY_STATUS_COLORS: Record<DayStatus, string> = {
  pending: 'var(--rai-muted)',
  generated: 'var(--rai-purple)',
  approved: 'var(--rai-gold)',
  published: 'var(--rai-success)',
  failed: 'var(--rai-error)',
};

export const PILLAR_COLORS: Record<string, string> = {
  P1: '#3b82f6',
  P2: '#8b5cf6',
  P3: '#f59e0b',
  P4: '#10b981',
  P5: '#ec4899',
};

export const SCHED_LABELS: Record<ScheduledPostView['status'], string> = {
  draft: 'Borrador',
  scheduled: 'Programado',
  publishing: 'Publicando',
  published: 'Publicado',
  failed: 'Falló',
  cancelled: 'Cancelado',
};

export const SCHED_COLORS: Record<ScheduledPostView['status'], string> = {
  draft: 'var(--rai-muted)',
  scheduled: 'var(--rai-gold)',
  publishing: 'var(--rai-purple)',
  published: 'var(--rai-success)',
  failed: 'var(--rai-error)',
  cancelled: 'var(--rai-muted)',
};

export const CFG_SECTION_IDS = ['cfg-negocio', 'cfg-marca', 'cfg-fotos', 'cfg-instagram', 'cfg-reglas', 'cfg-notas'];
export const CFG_OPTIONAL_IDS = ['cfg-reglas', 'cfg-notas'];

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'OpenAI' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { id: 'claude-sonnet-4', label: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'claude-haiku-4', label: 'Claude Haiku 4', provider: 'Anthropic' },
];

export const DEFAULT_MODEL = 'gemini-2.5-flash';

export const DEFAULT_WELCOME: ChatMessage = {
  role: 'system',
  content: '¡Hola! Soy tu asistente de contenido para Instagram. Vamos a planear 30 días de contenido para tu negocio. Para empezar necesito saber:\n\n1. **¿Cuál es tu negocio?** (tipo, nombre, ubicación)\n2. **¿Quién es tu cliente ideal?** (edad, intereses, necesidades)\n3. **¿Qué servicios o productos ofreces?**\n4. **¿Tienes fotos reales de tu negocio?**\n\nCuéntame y yo me encargo de crear tu plan completo.',
};

/** Atajos para arrancar la conversación sin escribir desde cero. */
export const CHAT_SUGGESTIONS = [
  'Tengo un negocio local y quiero planear 30 días de contenido.',
  'Mi cliente ideal tiene entre 25 y 45 años y busca calidad.',
  'Tengo fotos reales de mi negocio para usar en las publicaciones.',
];

export const TONE_OPTIONS = [
  { value: 'amigable', label: 'Amigable y cercano' },
  { value: 'profesional', label: 'Profesional y elegante' },
  { value: 'divertido', label: 'Divertido y casual' },
  { value: 'inspiracional', label: 'Inspiracional y motivador' },
  { value: 'informativo', label: 'Informativo y educativo' },
  { value: 'lujoso', label: 'Lujoso y exclusivo' },
];

export const PHOTO_MODE_OPTIONS = [
  { value: 'real', label: 'Solo fotos reales del negocio' },
  { value: 'ai', label: 'Solo imágenes generadas por IA' },
  { value: 'mixed', label: 'Mixto: reales + IA según el post' },
];

export const LOGO_MODE_OPTIONS = [
  { value: 'manual', label: 'Manual (Canva u otro editor)' },
  { value: 'auto', label: 'Automático (IA + verificación QA)' },
  { value: 'none', label: 'Sin logo en posts' },
];

/** Estructura de carpetas que genera cada campaña (solo informativa). */
export function folderTreeLines(folderName: string): string[] {
  return [
    `${folderName}/`,
    '├── brief.json',
    '├── calendario.json',
    '├── dia_01/',
    '│   ├── imagen_01.png',
    '│   ├── caption.txt',
    '│   └── metadata.json',
    '├── dia_02/',
    '│   ├── imagen_01.png',
    '│   └── metadata.json',
    '├── ...',
    '├── dia_30/',
    '│   ├── imagen_01.png',
    '│   └── metadata.json',
    '└── assets/',
    '    ├── logo.png',
    '    ├── fotos_reales/',
    '    └── plantillas/',
  ];
}
