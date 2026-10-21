/** Enlaces de activación y UTM: validación y construcción de URLs. Lógica pura. */

export interface LinkItem {
  id: string;
  label: string;
  slug: string;
  destination: string;
  clicks: number;
  createdAt?: string;
}

export type DestinationResult = { ok: true; url: string } | { ok: false; error: string };

/** Acepta «ejemplo.com/pagina» (añade https://) y rechaza esquemas que no sean http(s). */
export function normalizeDestination(raw: string): DestinationResult {
  const text = raw.trim();
  if (!text) return { ok: false, error: 'Escribe la dirección de destino.' };
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/]+:\d+(\/|$)/.test(text);
  const candidate = hasScheme ? text : `https://${text}`;
  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return { ok: false, error: 'La dirección no es válida.' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, error: 'Solo se permiten direcciones http o https.' };
  const host = u.hostname;
  if (host !== 'localhost' && !host.includes('.')) return { ok: false, error: 'Falta el dominio (por ejemplo, tuempresa.com).' };
  return { ok: true, url: u.toString() };
}

/** Misma regla que el API (minúsculas, a-z, 0-9 y guion), más guiones compactados. */
export function sanitizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function publicLinkUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/+$/, '')}/go/${slug}`;
}

export function totalClicks(links: Array<Pick<LinkItem, 'clicks'>>): number {
  return links.reduce((n, l) => n + (Number.isFinite(l.clicks) ? l.clicks : 0), 0);
}

export function hostOf(url: string): string {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export type LinkSort = 'recent' | 'clicks';

export function sortLinks<T extends LinkItem>(links: T[], by: LinkSort): T[] {
  const copy = [...links];
  if (by === 'clicks') return copy.sort((a, b) => b.clicks - a.clicks);
  return copy.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export interface UtmInput {
  url: string;
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

const utmClean = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '_');

/** URL con parámetros UTM; conserva los parámetros que ya tenía el destino. */
export function buildUtmUrl(i: UtmInput): DestinationResult {
  const base = normalizeDestination(i.url);
  if (!base.ok) return base;
  if (!i.source.trim() || !i.medium.trim() || !i.campaign.trim()) {
    return { ok: false, error: 'Origen, medio y campaña son obligatorios.' };
  }
  const u = new URL(base.url);
  u.searchParams.set('utm_source', utmClean(i.source));
  u.searchParams.set('utm_medium', utmClean(i.medium));
  u.searchParams.set('utm_campaign', utmClean(i.campaign));
  if (i.term?.trim()) u.searchParams.set('utm_term', utmClean(i.term));
  if (i.content?.trim()) u.searchParams.set('utm_content', utmClean(i.content));
  return { ok: true, url: u.toString() };
}

/** Combinaciones frecuentes de origen/medio para anuncios. */
export const UTM_PRESETS: ReadonlyArray<{ id: string; label: string; source: string; medium: string }> = [
  { id: 'meta', label: 'Meta Ads', source: 'facebook', medium: 'paid_social' },
  { id: 'ig-bio', label: 'Bio de Instagram', source: 'instagram', medium: 'bio' },
  { id: 'tiktok', label: 'TikTok Ads', source: 'tiktok', medium: 'paid_social' },
  { id: 'google', label: 'Google Ads', source: 'google', medium: 'cpc' },
  { id: 'email', label: 'Correo', source: 'email', medium: 'newsletter' },
  { id: 'whatsapp', label: 'WhatsApp', source: 'whatsapp', medium: 'chat' },
];

/** Lista de direcciones (una por línea o separadas por coma): válidas normalizadas, sin repetir, y las rechazadas. */
export function parseUrlList(text: string, max = 5): { urls: string[]; invalid: string[]; tooMany: boolean } {
  const parts = text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  const urls: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    const r = normalizeDestination(p);
    if (!r.ok) invalid.push(p);
    else if (!urls.includes(r.url)) urls.push(r.url);
  }
  return { urls: urls.slice(0, max), invalid, tooMany: urls.length > max };
}
