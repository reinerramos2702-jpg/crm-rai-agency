// Accesos rápidos del Dashboard que cada persona puede fijar y reordenar.
// Lógica pura; localStorage lo toca la página dentro de un efecto (hidratación).

import { MODULE_ACCESS, type Role } from './roles-shared';

export const DASH_PINS_KEY = 'rai-dash-pins-v1';
export const MAX_PINS = 6;

export type QuickActionTone = 'gold' | 'purple' | 'teal';
export type QuickActionIcon =
  | 'plus' | 'instagram' | 'calendar' | 'chat' | 'contacts' | 'leads' | 'payments' | 'agents' | 'images' | 'rocket';

export interface QuickActionDef {
  id: string;
  href: string;
  label: string;
  hint: string;
  icon: QuickActionIcon;
  tone: QuickActionTone;
}

export const QUICK_ACTIONS: QuickActionDef[] = [
  { id: 'campaign', href: '/campaign/new', label: 'Nueva campaña', hint: 'La IA genera hasta 31 días', icon: 'plus', tone: 'gold' },
  { id: 'instagram', href: '/automatizacion', label: 'Contenido Instagram', hint: 'Planea, programa y publica', icon: 'instagram', tone: 'purple' },
  { id: 'calendar', href: '/calendarios', label: 'Calendarios', hint: 'Citas y reservas', icon: 'calendar', tone: 'teal' },
  { id: 'chat', href: '/conversaciones', label: 'Conversaciones', hint: 'Responde a tus clientes', icon: 'chat', tone: 'gold' },
  { id: 'contacts', href: '/contactos', label: 'Contactos', hint: 'Tu base de clientes', icon: 'contacts', tone: 'teal' },
  { id: 'leads', href: '/clientes-potenciales', label: 'Clientes potenciales', hint: 'Oportunidades de venta', icon: 'leads', tone: 'purple' },
  { id: 'payments', href: '/pagos', label: 'Pagos', hint: 'Cobros y comprobantes', icon: 'payments', tone: 'gold' },
  { id: 'agents', href: '/agentes-ia', label: 'Agentes de IA', hint: 'Asistentes que trabajan por ti', icon: 'agents', tone: 'purple' },
  { id: 'images', href: '/generador-imagenes', label: 'Generador de imágenes', hint: 'Diseños para tus publicaciones', icon: 'images', tone: 'teal' },
  { id: 'launchpad', href: '/launchpad', label: 'Guía de Inicio', hint: 'Configura tu plataforma', icon: 'rocket', tone: 'gold' },
];

export const DEFAULT_PINS: string[] = ['campaign', 'instagram', 'calendar', 'chat'];

const BY_ID = new Map(QUICK_ACTIONS.map((a) => [a.id, a]));

/** ¿Puede este rol abrir el módulo? Sin rol conocido aún, se asume que sí. */
export function canOpen(href: string, role: Role | string | null | undefined): boolean {
  if (!role) return true;
  const allowed = MODULE_ACCESS[href];
  return !allowed || (allowed as string[]).includes(role);
}

/** Lee los accesos fijados; descarta ids desconocidos y duplicados. Sin datos, los predeterminados. */
export function parsePins(raw: string | null | undefined): string[] {
  if (!raw) return [...DEFAULT_PINS];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [...DEFAULT_PINS];
    const ids = Array.from(new Set(data.filter((x): x is string => typeof x === 'string' && BY_ID.has(x))));
    return ids.slice(0, MAX_PINS);
  } catch {
    return [...DEFAULT_PINS];
  }
}

export function togglePin(pins: readonly string[], id: string): string[] {
  if (!BY_ID.has(id)) return [...pins];
  if (pins.includes(id)) return pins.filter((p) => p !== id);
  return pins.length >= MAX_PINS ? [...pins] : [...pins, id];
}

/** Mueve un acceso una posición (−1 izquierda/arriba, +1 derecha/abajo). */
export function movePin(pins: readonly string[], id: string, delta: -1 | 1): string[] {
  const from = pins.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= pins.length) return [...pins];
  const next = [...pins];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** Accesos fijados, en orden, solo los que el rol puede abrir. */
export function resolvePins(pins: readonly string[], role: Role | string | null | undefined): QuickActionDef[] {
  return pins.map((id) => BY_ID.get(id)).filter((a): a is QuickActionDef => !!a && canOpen(a.href, role));
}

/** Accesos que se pueden añadir (no fijados y permitidos al rol). */
export function availablePins(pins: readonly string[], role: Role | string | null | undefined): QuickActionDef[] {
  return QUICK_ACTIONS.filter((a) => !pins.includes(a.id) && canOpen(a.href, role));
}
