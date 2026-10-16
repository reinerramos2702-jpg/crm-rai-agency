/**
 * Brief estructurado de la campaña (objetivo, público, tono, frecuencia y pilares).
 * Lo edita la persona en el panel «Resumen del plan» y viaja a la IA como contexto.
 */

export const BRIEF_FIELDS = [
  { key: 'objective', label: 'Objetivo', placeholder: 'Ej: más reservas por WhatsApp', multiline: false },
  { key: 'audience', label: 'Público', placeholder: 'Ej: familias de 25 a 45 años en Caracas', multiline: false },
  { key: 'tone', label: 'Tono', placeholder: 'Ej: cercano, profesional, sin tecnicismos', multiline: false },
  { key: 'frequency', label: 'Frecuencia', placeholder: 'Ej: 30 días, una pieza diaria', multiline: false },
  { key: 'pillars', label: 'Pilares de contenido', placeholder: 'Un pilar por línea', multiline: true },
] as const;

export type BriefKey = (typeof BRIEF_FIELDS)[number]['key'];
export type CampaignBrief = Record<BriefKey, string>;

/** Tope por campo: protege el almacenamiento y el contexto enviado a la IA. */
export const MAX_BRIEF_FIELD = 1_000;

export const EMPTY_BRIEF: CampaignBrief = {
  objective: '',
  audience: '',
  tone: '',
  frequency: '',
  pillars: '',
};

export function isCampaignBrief(value: unknown): value is CampaignBrief {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return BRIEF_FIELDS.every(({ key }) => typeof v[key] === 'string' && (v[key] as string).length <= MAX_BRIEF_FIELD);
}

/** Cuántos campos del brief tienen contenido (ignora espacios). */
export function briefFilledCount(brief: CampaignBrief): number {
  return BRIEF_FIELDS.filter(({ key }) => brief[key].trim().length > 0).length;
}

/** Bloque de contexto para la IA; vacío si no hay nada escrito. */
export function briefToContext(brief: CampaignBrief): string {
  const lines = BRIEF_FIELDS.filter(({ key }) => brief[key].trim()).map(
    ({ key, label }) => `- ${label}: ${brief[key].trim().replace(/\s*\n\s*/g, ' / ')}`,
  );
  return lines.length ? `\n\n[BRIEF DE LA CAMPAÑA]\n${lines.join('\n')}` : '';
}
