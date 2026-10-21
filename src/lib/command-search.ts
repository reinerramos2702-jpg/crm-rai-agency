/**
 * Búsqueda difusa mínima para la paleta de comandos.
 * Sin dependencias: ignora tildes y mayúsculas, y prioriza coincidencias exactas,
 * por prefijo y por inicio de palabra sobre las dispersas.
 */

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Puntaje de un solo término contra un texto ya normalizado (0 = sin coincidencia). */
function scoreToken(token: string, text: string): number {
  if (!token) return 1;
  if (text.startsWith(token)) return text.length === token.length ? 100 : 90;
  if (text.includes(` ${token}`)) return 80;
  const at = text.indexOf(token);
  if (at >= 0) return Math.max(50, 70 - at);

  // Subsecuencia: las letras aparecen en orden; penaliza los saltos.
  let pos = -1;
  let gaps = 0;
  for (const ch of token) {
    const next = text.indexOf(ch, pos + 1);
    if (next < 0) return 0;
    if (pos >= 0) gaps += next - pos - 1;
    pos = next;
  }
  return Math.max(1, 40 - gaps);
}

/** Puntaje de una consulta (varios términos) contra un texto. Todos los términos deben coincidir. */
export function scoreMatch(query: string, text: string): number {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;
  const haystack = normalizeText(text);
  let total = 0;
  for (const token of tokens) {
    const s = scoreToken(token, haystack);
    if (s === 0) return 0;
    total += s;
  }
  return total / tokens.length;
}

/** Filtra y ordena por puntaje descendente; a igualdad conserva el orden original. */
export function rankItems<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  if (!normalizeText(query)) return items;
  return items
    .map((item, index) => ({ item, index, score: scoreMatch(query, getText(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item);
}
