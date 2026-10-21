/**
 * Búsqueda por palabras clave en una base de conocimiento (sin embeddings): BM25 simplificado
 * sobre fragmentos cortos. Es lo que contesta la herramienta `buscar_conocimiento` durante la llamada,
 * así que prioriza respuestas breves (se leen en voz alta).
 */

export interface KbItemInput {
  id: string;
  type: string;
  question: string | null;
  answer: string | null;
  title: string | null;
  content: string | null;
  data: unknown;
}

export interface KbChunk {
  itemId: string;
  title: string;
  body: string;
}

export interface KbHit {
  itemId: string;
  title: string;
  text: string;
  score: number;
}

const STOPWORDS = new Set([
  'a', 'al', 'algo', 'con', 'como', 'cual', 'cuales', 'cuanto', 'cuanta', 'cuantos', 'de', 'del', 'el', 'ella', 'en', 'es', 'esa', 'ese', 'eso',
  'esta', 'este', 'esto', 'hay', 'la', 'las', 'le', 'lo', 'los', 'me', 'mi', 'muy', 'no', 'o', 'para', 'por', 'que', 'quiero', 'saber', 'se',
  'si', 'su', 'sus', 'tiene', 'tienen', 'un', 'una', 'unos', 'unas', 'y', 'ya', 'yo', 'tu', 'te', 'hola', 'buenas', 'buenos', 'dias', 'tardes', 'favor', 'puede', 'pueden',
]);

export const stripAccents = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function stem(w: string): string {
  if (w.length > 5 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return stripAccents(text.toLowerCase())
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 0 && (w.length > 1 || /\d/.test(w)) && !STOPWORDS.has(w))
    .map(stem);
}

function flatten(value: unknown, depth = 0): string {
  if (value === null || value === undefined || depth > 3) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => flatten(v, depth + 1)).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const f = flatten(v, depth + 1);
        return f ? `${k}: ${f}` : '';
      })
      .filter(Boolean)
      .join('; ');
  }
  return '';
}

const MAX_CHUNK_CHARS = 600;

function splitParagraphs(text: string): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n{2,}|\r\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
    if (para.length <= MAX_CHUNK_CHARS) {
      out.push(para);
      continue;
    }
    let buf = '';
    for (const sentence of para.split(/(?<=[.!?])\s+/)) {
      if (buf && buf.length + sentence.length > MAX_CHUNK_CHARS) {
        out.push(buf);
        buf = '';
      }
      buf += (buf ? ' ' : '') + sentence;
    }
    if (buf) out.push(buf);
  }
  return out;
}

/** Divide un elemento de la base en fragmentos buscables. */
export function chunkItem(item: KbItemInput): KbChunk[] {
  const title = (item.question || item.title || '').trim();
  if (item.type === 'faq' || (item.question && item.answer)) {
    const answer = (item.answer ?? '').trim();
    return title || answer ? [{ itemId: item.id, title, body: answer }] : [];
  }
  if (item.type === 'table') {
    const data = item.data;
    const rows: unknown[] = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray((data as { rows?: unknown }).rows)
        ? ((data as { rows: unknown[] }).rows)
        : [];
    const chunks = rows.map((r) => ({ itemId: item.id, title, body: flatten(r) })).filter((c) => c.body);
    if (chunks.length > 0) return chunks;
  }
  const raw = (item.content ?? '').trim() || flatten(item.data);
  return splitParagraphs(raw).map((body) => ({ itemId: item.id, title, body }));
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export interface RankOptions {
  topK?: number;
  maxChars?: number;
}

const K1 = 1.4;
const B = 0.6;
const TITLE_WEIGHT = 3;

export function rankKnowledge(items: readonly KbItemInput[], query: string, opts: RankOptions = {}): KbHit[] {
  const topK = Math.min(Math.max(opts.topK ?? 3, 1), 8);
  const maxChars = Math.min(Math.max(opts.maxChars ?? 320, 80), 1200);
  const qTokens = Array.from(new Set(tokenize(query)));
  if (qTokens.length === 0) return [];

  const chunks = items.flatMap(chunkItem);
  if (chunks.length === 0) return [];

  const docs = chunks.map((c) => {
    const title = tokenize(c.title);
    const body = tokenize(c.body);
    return { chunk: c, title, body, len: title.length * TITLE_WEIGHT + body.length || 1 };
  });
  const avgLen = docs.reduce((a, d) => a + d.len, 0) / docs.length;
  const N = docs.length;

  const count = (list: string[], t: string): number => {
    let n = 0;
    for (const w of list) if (w === t || (t.length >= 4 && w.length >= 4 && (w.startsWith(t) || t.startsWith(w)))) n += 1;
    return n;
  };

  const df = new Map<string, number>();
  for (const t of qTokens) df.set(t, docs.filter((d) => count(d.title, t) + count(d.body, t) > 0).length);

  const scored = docs.map((d) => {
    let score = 0;
    let matched = 0;
    for (const t of qTokens) {
      const tf = count(d.title, t) * TITLE_WEIGHT + count(d.body, t);
      if (tf === 0) continue;
      matched += 1;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (d.len / avgLen))));
    }
    // Premio por cubrir más palabras de la pregunta.
    score *= 1 + 0.5 * (matched / qTokens.length);
    return { d, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.d.chunk.itemId.localeCompare(b.d.chunk.itemId))
    .slice(0, topK)
    .map(({ d, score }) => ({
      itemId: d.chunk.itemId,
      title: clip(d.chunk.title, 120),
      text: clip(d.chunk.title && d.chunk.body ? `${d.chunk.title}: ${d.chunk.body}` : d.chunk.title || d.chunk.body, maxChars),
      score: Math.round(score * 1000) / 1000,
    }));
}
