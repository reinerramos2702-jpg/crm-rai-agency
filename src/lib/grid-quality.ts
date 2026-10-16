/**
 * Control de calidad de un copy (caption) de Instagram: largo, gancho, llamada a
 * la acción, hashtags y coherencia con el documento de marca. Devuelve un
 * puntaje de 0 a 100 y pistas accionables. Es una guía heurística, no un juez.
 */
import { normalizeText } from './grid-filters';

export const CAPTION_LIMIT = 2200;
export const HASHTAGS_MAX = 30;
export const HASHTAGS_IDEAL_MIN = 20;
export const HOOK_MAX_WORDS = 12;

export type CheckState = 'ok' | 'warn' | 'bad' | 'skip';

export interface QualityCheck {
  id: 'length' | 'hook' | 'cta' | 'hashtags' | 'brand';
  label: string;
  state: CheckState;
  /** Pista accionable, breve. */
  hint: string;
}

export interface QualityResult {
  /** 0–100. */
  score: number;
  level: 'good' | 'fair' | 'low';
  checks: QualityCheck[];
}

const CTA_PATTERN =
  /(?<![\p{L}\p{N}])(comenta|comparte|guarda|guárdalo|escr[ií]benos|escr[ií]beme|escr[ií]bele|cont[aá]ctanos|cont[aá]ctame|reserva|reserva ya|agenda|cotiza|solicita|descarga|suscr[ií]bete|s[ií]guenos|s[ií]gueme|visita|pide|pr[uú]ebalo|compra|aprovecha|inscr[ií]bete|etiqueta|env[ií]anos|m[aá]ndanos|dm|whatsapp|link en (?:la )?bio|enlace en (?:la )?bio|haz clic|clic aqu[ií])(?![\p{L}\p{N}])/iu;

const STOPWORDS = new Set(
  (
    'para como pero porque cuando donde desde hasta entre sobre tambien todos todas cada otra otro estos estas ' +
    'esto esta este esos esas tiene tienen puede pueden debe deben siempre nunca mismo misma muy mas menos ' +
    'cual cuales quien quienes sido sera seran hacer hace hacen donde aqui alli asi bien solo solo ' +
    'ademas antes despues durante segun sino aunque mientras tras usar usan uso debe'
  ).split(' '),
);

export function countHashtags(text: string): number {
  return (text.match(/(?:^|\s)#[\p{L}\p{N}_]+/gu) ?? []).length;
}

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Primera línea con texto, sin marcas de formato. */
export function firstLine(text: string): string {
  const line = text.split('\n').find((l) => l.trim() !== '') ?? '';
  return line.replace(/[*_#>]/g, '').trim();
}

/** Términos frecuentes del documento de marca (para medir coherencia). */
export function brandTerms(brandDocText: string | null | undefined, limit = 40): string[] {
  if (!brandDocText) return [];
  const counts = new Map<string, number>();
  for (const raw of normalizeText(brandDocText).split(/[^a-z0-9ñ]+/)) {
    if (raw.length < 5 || STOPWORDS.has(raw) || /^\d+$/.test(raw)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

const STATE_SCORE: Record<Exclude<CheckState, 'skip'>, number> = { ok: 1, warn: 0.5, bad: 0 };

export function assessCopy(caption: string, brandDocText?: string | null): QualityResult | null {
  const text = caption.trim();
  if (!text) return null;

  const checks: QualityCheck[] = [];

  // Largo
  const len = text.length;
  if (len > CAPTION_LIMIT) {
    checks.push({ id: 'length', label: 'Largo', state: 'bad', hint: `Supera el límite de ${CAPTION_LIMIT} caracteres de Instagram por ${len - CAPTION_LIMIT}.` });
  } else if (len < 120) {
    checks.push({ id: 'length', label: 'Largo', state: 'warn', hint: 'Muy corto: desarrolla el problema y la solución en 3 a 6 párrafos breves.' });
  } else if (len > 1800) {
    checks.push({ id: 'length', label: 'Largo', state: 'warn', hint: 'Muy extenso: acorta para que se lea completo antes del «ver más».' });
  } else {
    checks.push({ id: 'length', label: 'Largo', state: 'ok', hint: `${len.toLocaleString('es')} caracteres: buen rango.` });
  }

  // Gancho
  const hook = firstLine(text);
  const hookWords = words(hook).length;
  if (hookWords > HOOK_MAX_WORDS * 2) {
    checks.push({ id: 'hook', label: 'Gancho', state: 'bad', hint: `La primera línea tiene ${hookWords} palabras: reduce a ${HOOK_MAX_WORDS} o menos.` });
  } else if (hookWords > HOOK_MAX_WORDS) {
    checks.push({ id: 'hook', label: 'Gancho', state: 'warn', hint: `La primera línea tiene ${hookWords} palabras: acórtala a ${HOOK_MAX_WORDS} o menos.` });
  } else {
    checks.push({ id: 'hook', label: 'Gancho', state: 'ok', hint: 'Primera línea breve y directa.' });
  }

  // Llamada a la acción (+ pregunta de anclaje)
  const hasCta = CTA_PATTERN.test(text);
  const hasQuestion = text.includes('?');
  if (hasCta && hasQuestion) {
    checks.push({ id: 'cta', label: 'Llamada a la acción', state: 'ok', hint: 'Incluye acción y pregunta de cierre.' });
  } else if (hasCta) {
    checks.push({ id: 'cta', label: 'Llamada a la acción', state: 'warn', hint: 'Añade una pregunta de anclaje para provocar comentarios.' });
  } else {
    checks.push({ id: 'cta', label: 'Llamada a la acción', state: 'bad', hint: 'Falta una acción clara: comenta, guarda, escribe o reserva.' });
  }

  // Hashtags
  const tags = countHashtags(text);
  if (tags > HASHTAGS_MAX) {
    checks.push({ id: 'hashtags', label: 'Hashtags', state: 'bad', hint: `Tienes ${tags}: Instagram admite ${HASHTAGS_MAX}. Quita ${tags - HASHTAGS_MAX}.` });
  } else if (tags >= HASHTAGS_IDEAL_MIN) {
    checks.push({ id: 'hashtags', label: 'Hashtags', state: 'ok', hint: `${tags} hashtags: dentro del rango recomendado.` });
  } else if (tags >= 5) {
    checks.push({ id: 'hashtags', label: 'Hashtags', state: 'warn', hint: `Tienes ${tags}: el sistema de contenido pide ${HASHTAGS_IDEAL_MIN} o más, agrupados.` });
  } else {
    checks.push({ id: 'hashtags', label: 'Hashtags', state: 'bad', hint: tags === 0 ? 'No hay hashtags: añade un bloque al final.' : `Solo ${tags}: añade más (nicho, negocio y alcance).` });
  }

  // Marca
  const terms = brandTerms(brandDocText);
  if (terms.length === 0) {
    checks.push({
      id: 'brand',
      label: 'Marca',
      state: 'skip',
      hint: 'Sube tu documento de marca para validar la coherencia del copy.',
    });
  } else {
    const normalized = normalizeText(text);
    const used = terms.filter((t) => normalized.includes(t));
    if (used.length >= 3) {
      checks.push({ id: 'brand', label: 'Marca', state: 'ok', hint: `Usa términos de tu marca: ${used.slice(0, 3).join(', ')}.` });
    } else {
      const missing = terms.filter((t) => !used.includes(t)).slice(0, 3);
      checks.push({
        id: 'brand',
        label: 'Marca',
        state: used.length === 0 ? 'bad' : 'warn',
        hint: `Poca presencia del vocabulario de tu marca. Prueba con: ${missing.join(', ')}.`,
      });
    }
  }

  const scored = checks.filter((c): c is QualityCheck & { state: Exclude<CheckState, 'skip'> } => c.state !== 'skip');
  const score = Math.round((scored.reduce((acc, c) => acc + STATE_SCORE[c.state], 0) / scored.length) * 100);
  return { score, level: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'low', checks };
}
