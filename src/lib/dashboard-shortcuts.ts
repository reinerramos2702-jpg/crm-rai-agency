// Atajos de teclado discretos del Dashboard. Pura: decide qué acción corresponde
// a una pulsación (la página ejecuta el efecto). No interfiere con Ctrl+K / Ctrl+B.

export type DashShortcut = 'new-campaign' | 'focus-search' | 'refresh' | 'period-7' | 'period-30' | 'customize';

export interface ShortcutKeyEvent {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}

export interface ShortcutContext {
  /** El foco está en un campo editable (input, textarea, select, contenteditable). */
  typing: boolean;
  /** Hay un diálogo o recorrido abierto. */
  blocked: boolean;
}

export const SHORTCUT_HINTS: Array<{ keys: string; label: string }> = [
  { keys: 'N', label: 'Nueva campaña' },
  { keys: '/', label: 'Buscar campaña' },
  { keys: 'R', label: 'Actualizar' },
  { keys: '7 · 3', label: 'Periodo 7 o 30 días' },
  { keys: 'P', label: 'Personalizar accesos' },
];

export function shortcutFor(e: ShortcutKeyEvent, ctx: ShortcutContext): DashShortcut | null {
  if (ctx.typing || ctx.blocked || e.isComposing) return null;
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  switch (e.key) {
    case 'n': case 'N': return 'new-campaign';
    case '/': return 'focus-search';
    case 'r': case 'R': return 'refresh';
    case '7': return 'period-7';
    case '3': return 'period-30';
    case 'p': case 'P': return 'customize';
    default: return null;
  }
}

/** ¿El elemento enfocado es un campo donde se escribe? */
export function isTypingTarget(el: { tagName?: string; isContentEditable?: boolean } | null | undefined): boolean {
  if (!el) return false;
  const tag = (el.tagName ?? '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el.isContentEditable;
}
