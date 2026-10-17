/** Ficha de marca: colores, tono, documento y lista de pendientes. Lógica pura. */

const HEX_RE = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

export function normalizeHex(h: string): string {
  const t = h.trim().toUpperCase();
  if (/^#[0-9A-F]{3}$/.test(t)) return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`;
  return t;
}

/** Colores hexadecimales encontrados en un texto (sin repetir, máx. 12). */
export function extractHexColors(text: string, max = 12): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(HEX_RE)) {
    const n = normalizeHex(m[0]);
    if (!out.includes(n)) out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

/** Texto negro o blanco según el contraste con el color de fondo. */
export function readableOn(hex: string): '#0A0A0F' | '#FFFFFF' {
  const n = normalizeHex(hex);
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0A0A0F' : '#FFFFFF';
}

export interface ParsedBrandProfile {
  colors: string[];
  tone: string;
  voice: string;
  lists: Array<{ label: string; items: string[] }>;
}

const str = (v: unknown, max = 300): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function strings(v: unknown, max = 8): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' ? str((x as Record<string, unknown>).name ?? (x as Record<string, unknown>).title ?? '', 80) : ''))
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, max);
  }
  return [];
}

/** Lee `Workspace.brandProfile` (JSON libre) sin asumir su forma exacta. */
export function parseBrandProfile(json: unknown): ParsedBrandProfile {
  const empty: ParsedBrandProfile = { colors: [], tone: '', voice: '', lists: [] };
  if (!json || typeof json !== 'object' || Array.isArray(json)) return empty;
  const o = json as Record<string, unknown>;
  const rawColors = o.colors ?? o.palette ?? o.brandColors ?? o.colores;
  let colors: string[] = [];
  if (typeof rawColors === 'string') colors = extractHexColors(rawColors);
  else if (Array.isArray(rawColors)) colors = extractHexColors(rawColors.filter((c): c is string => typeof c === 'string').join(' '));
  else if (rawColors && typeof rawColors === 'object') colors = extractHexColors(Object.values(rawColors).filter((c): c is string => typeof c === 'string').join(' '));
  const lists = [
    { label: 'Productos', items: strings(o.products ?? o.productos) },
    { label: 'Personajes', items: strings(o.characters ?? o.personajes) },
    { label: 'Valores', items: strings(o.values ?? o.valores) },
  ].filter((l) => l.items.length > 0);
  return { colors, tone: str(o.tone ?? o.tono, 200), voice: str(o.voice ?? o.voz, 300), lists };
}

export interface BrandInput {
  configured: boolean;
  businessName: string;
  brandTone: string;
  brandColors: string;
  targetAudience: string;
  services: string;
  igHandle: string;
  rulesCount: number;
  hasDoc: boolean;
  hasProfile: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  href: string;
}

export function brandChecklist(i: BrandInput): ChecklistItem[] {
  const cfgHref = '/automatizacion';
  return [
    { id: 'name', label: 'Nombre del negocio', hint: 'Aparece en publicaciones, correos y reportes.', done: !!i.businessName.trim(), href: cfgHref },
    { id: 'colors', label: 'Paleta de colores', hint: 'Escribe tus colores con su código (por ejemplo #C9A84C).', done: !!i.brandColors.trim(), href: cfgHref },
    { id: 'tone', label: 'Tono de marca', hint: 'Define cómo habla tu marca (cercano, formal, divertido).', done: i.configured && !!i.brandTone.trim(), href: cfgHref },
    { id: 'audience', label: 'Público objetivo', hint: 'Mejora los textos que genera la IA.', done: !!i.targetAudience.trim(), href: cfgHref },
    { id: 'services', label: 'Servicios o productos', hint: 'Qué vendes, en una lista corta.', done: !!i.services.trim(), href: cfgHref },
    { id: 'ig', label: 'Cuenta de Instagram', hint: 'Necesaria para programar publicaciones.', done: !!i.igHandle.trim(), href: cfgHref },
    { id: 'doc', label: 'Documento de marca (.docx)', hint: 'Súbelo en el Generador: la IA lo usa como guía.', done: i.hasDoc, href: '/generador-imagenes' },
  ];
}

/** Porcentaje de pendientes resueltos (0–100). */
export function brandScore(items: ChecklistItem[]): number {
  if (items.length === 0) return 0;
  return Math.round((items.filter((x) => x.done).length / items.length) * 100);
}

/** Todos los colores de marca disponibles: el perfil gana sobre el texto libre, sin repetir. */
export function mergePalette(profileColors: string[], freeText: string, docText = ''): string[] {
  const out: string[] = [];
  for (const c of [...profileColors, ...extractHexColors(freeText), ...extractHexColors(docText)]) {
    if (!out.includes(c)) out.push(c);
    if (out.length >= 12) break;
  }
  return out;
}
