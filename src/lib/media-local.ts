/**
 * Datos que viven SOLO en el navegador (localStorage), porque no hay esquema
 * ni almacenamiento persistente para ellos en el servidor:
 *  - referencias: enlaces importados a mano como atajo, no como archivos subidos;
 *  - etiquetas por activo;
 *  - vistas guardadas (combinaciones de filtros).
 * Lógica pura: la lectura/escritura real de localStorage está en use-media-local.ts.
 */
import { extensionOf, kindFromExtension, safeHttpUrl } from './media-build';
import { sanitizeMediaView, type MediaView } from './media-filter';
import { MEDIA_KINDS, type MediaItem, type MediaKind } from './media-types';

export const REFS_KEY = 'rai-media-refs-v1';
export const TAGS_KEY = 'rai-media-tags-v1';
export const VIEWS_KEY = 'rai-media-views-v1';
export const VIEW_KEY = 'rai-media-vista-v1';

export const MAX_REFS = 200;
export const MAX_TAGS_PER_ITEM = 8;
export const MAX_TAG_LENGTH = 24;
export const MAX_SAVED_VIEWS = 8;
const MAX_TITLE_LENGTH = 80;

export interface MediaRef {
  id: string;
  url: string;
  title: string;
  kind: MediaKind;
  addedAt: string;
}

export type SavedView = { name: string; view: Omit<MediaView, 'tab'> };

function parseJson(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Hash estable (djb2) para que la misma URL tenga siempre el mismo id y conserve sus etiquetas. */
export function hashUrl(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i += 1) h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Tipo sugerido para un enlace: por su extensión; si no se reconoce, imagen. */
export function guessKind(url: string): MediaKind {
  return kindFromExtension(extensionOf(url)) ?? 'image';
}

export function parseRefs(raw: string | null | undefined): MediaRef[] {
  const data = parseJson(raw);
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: MediaRef[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const url = safeHttpUrl(e.url);
    const kind = MEDIA_KINDS.find((k) => k === e.kind);
    if (!url || !kind || seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: `reference:${hashUrl(url)}`,
      url,
      title: typeof e.title === 'string' && e.title.trim() ? e.title.trim().slice(0, MAX_TITLE_LENGTH) : hostOf(url),
      kind,
      addedAt: typeof e.addedAt === 'string' ? e.addedAt : new Date(0).toISOString(),
    });
    if (out.length >= MAX_REFS) break;
  }
  return out;
}

export type AddRefResult = { ok: true; refs: MediaRef[]; ref: MediaRef } | { ok: false; error: string };

export function addRef(
  refs: readonly MediaRef[],
  input: { url: string; title?: string; kind?: MediaKind },
  now: Date = new Date(),
): AddRefResult {
  const url = safeHttpUrl(input.url);
  if (!url) return { ok: false, error: 'Escribe un enlace completo que empiece por https:// o http://.' };
  if (refs.some((r) => r.url === url)) return { ok: false, error: 'Ese enlace ya está en tu biblioteca.' };
  if (refs.length >= MAX_REFS) return { ok: false, error: `Llegaste al máximo de ${MAX_REFS} enlaces. Quita alguno para añadir otro.` };
  const ref: MediaRef = {
    id: `reference:${hashUrl(url)}`,
    url,
    title: input.title?.trim() ? input.title.trim().slice(0, MAX_TITLE_LENGTH) : hostOf(url),
    kind: input.kind ?? guessKind(url),
    addedAt: now.toISOString(),
  };
  return { ok: true, refs: [ref, ...refs], ref };
}

export function removeRefs(refs: readonly MediaRef[], ids: ReadonlySet<string>): MediaRef[] {
  return refs.filter((r) => !ids.has(r.id));
}

export function refToItem(ref: MediaRef): MediaItem {
  return {
    id: ref.id,
    kind: ref.kind,
    origin: 'reference',
    title: ref.title,
    detail: hostOf(ref.url),
    note: '',
    url: ref.url,
    ext: extensionOf(ref.url),
    date: ref.addedAt,
    sourceHref: ref.url,
  };
}

/* ---------- Etiquetas ---------- */

export type TagMapMutable = Record<string, string[]>;

export function normalizeTag(value: string): string {
  return value.replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH);
}

export function parseTags(raw: string | null | undefined): TagMapMutable {
  const data = parseJson(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const out: TagMapMutable = {};
  for (const [id, value] of Object.entries(data as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const tags = uniqueTags(value.filter((t): t is string => typeof t === 'string').map(normalizeTag));
    if (tags.length > 0) out[id] = tags.slice(0, MAX_TAGS_PER_ITEM);
  }
  return out;
}

function uniqueTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Añade la etiqueta a cada activo (sin repetir ni pasar del máximo por activo). No muta el original. */
export function addTag(map: Readonly<TagMapMutable>, ids: readonly string[], tag: string): TagMapMutable {
  const clean = normalizeTag(tag);
  if (!clean) return { ...map };
  const next: TagMapMutable = { ...map };
  for (const id of ids) {
    const merged = uniqueTags([...(next[id] ?? []), clean]);
    next[id] = merged.slice(0, MAX_TAGS_PER_ITEM);
  }
  return next;
}

export function removeTag(map: Readonly<TagMapMutable>, id: string, tag: string): TagMapMutable {
  const next: TagMapMutable = { ...map };
  const left = (next[id] ?? []).filter((t) => t.toLowerCase() !== tag.toLowerCase());
  if (left.length > 0) next[id] = left;
  else delete next[id];
  return next;
}

/** Etiquetas en uso (solo de activos que aún existen), de más a menos usadas. */
export function tagCounts(map: Readonly<TagMapMutable>, validIds?: ReadonlySet<string>): Array<{ tag: string; count: number }> {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const [id, tags] of Object.entries(map)) {
    if (validIds && !validIds.has(id)) continue;
    for (const tag of tags) {
      const key = tag.toLowerCase();
      const hit = counts.get(key);
      if (hit) hit.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'es'));
}

/* ---------- Vistas guardadas ---------- */

export function parseSavedViews(raw: string | null | undefined): SavedView[] {
  const data = parseJson(raw);
  if (!Array.isArray(data)) return [];
  const out: SavedView[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === 'string' ? e.name.trim().slice(0, 30) : '';
    if (!name || !e.view || typeof e.view !== 'object') continue;
    const { tab: _tab, ...view } = sanitizeMediaView(e.view as Record<string, unknown>);
    void _tab;
    out.push({ name, view });
    if (out.length >= MAX_SAVED_VIEWS) break;
  }
  return out;
}

/** Guarda la vista (sin la pestaña); si el nombre ya existe la reemplaza. */
export function addSavedView(list: readonly SavedView[], name: string, view: MediaView): SavedView[] {
  const clean = name.trim().slice(0, 30);
  if (!clean) return [...list];
  const { tab: _tab, ...rest } = view;
  void _tab;
  const others = list.filter((v) => v.name.toLowerCase() !== clean.toLowerCase());
  return [{ name: clean, view: rest }, ...others].slice(0, MAX_SAVED_VIEWS);
}

export function removeSavedView(list: readonly SavedView[], name: string): SavedView[] {
  return list.filter((v) => v.name !== name);
}
