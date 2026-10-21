/** Fragmentos (Snippet): variables {{nombre}}, vista previa y búsqueda. Lógica pura. */

export interface SnippetItem {
  id: string;
  title: string;
  body: string;
  createdAt?: string;
}

export const SNIPPET_LIMITS = { title: 120, body: 5000 } as const;

/** Variables sugeridas en el editor, con un valor de ejemplo para la vista previa. */
export const SNIPPET_SAMPLE_VALUES: Record<string, string> = {
  nombre: 'María',
  empresa: 'Tu Empresa',
  telefono: '+58 412 000 0000',
  email: 'correo@ejemplo.com',
  fecha: 'viernes 20 de noviembre',
  enlace: 'https://tuempresa.com',
};

const VAR_RE = /\{\{\s*([\p{L}\p{N}_]{1,40})\s*\}\}/gu;

/** Variables presentes en el texto, sin repetir y en orden de aparición. */
export function extractVariables(body: string): string[] {
  const seen = new Set<string>();
  for (const m of body.matchAll(VAR_RE)) seen.add(m[1].toLowerCase());
  return Array.from(seen);
}

/** Sustituye cada variable con valor; las que no tienen valor quedan visibles tal cual. */
export function renderSnippet(body: string, values: Record<string, string>): string {
  return body.replace(VAR_RE, (full, name: string) => {
    const v = values[name.toLowerCase()];
    return v !== undefined && v.trim() !== '' ? v : full;
  });
}

export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function filterSnippets<T extends SnippetItem>(items: T[], query: string): T[] {
  const q = fold(query.trim());
  if (!q) return items;
  return items.filter((s) => fold(s.title).includes(q) || fold(s.body).includes(q));
}

/** Mensaje de error en español o null si el borrador es válido. */
export function validateSnippetDraft(d: { title: string; body: string }): string | null {
  if (!d.title.trim()) return 'Ponle un título al fragmento.';
  if (!d.body.trim()) return 'Escribe el texto del fragmento.';
  if (d.title.trim().length > SNIPPET_LIMITS.title) return `El título admite hasta ${SNIPPET_LIMITS.title} caracteres.`;
  if (d.body.trim().length > SNIPPET_LIMITS.body) return `El texto admite hasta ${SNIPPET_LIMITS.body} caracteres.`;
  return null;
}

/** Resumen de una línea para la lista. */
export function excerpt(body: string, max = 120): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}
