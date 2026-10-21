import type { ContentPlannerConfig } from './content-planner-config';

/** Subconjunto de la configuración de marca que usa «Nueva Campaña». */
export type BrandSource = Pick<
  ContentPlannerConfig,
  | 'businessName'
  | 'businessType'
  | 'businessLocation'
  | 'brandTone'
  | 'brandColors'
  | 'targetAudience'
  | 'services'
  | 'competitors'
  | 'contentNotes'
  | 'brandDocName'
  | 'brandDocContent'
> & { igHandle?: string };

/** Tope del texto generado: debe caber en el borrador (20 000) con holgura. */
export const MAX_BRAND_TEXT = 12_000;

const LINES: Array<[keyof BrandSource, string]> = [
  ['businessName', 'Negocio'],
  ['businessType', 'Tipo de negocio'],
  ['businessLocation', 'Ubicación'],
  ['igHandle', 'Instagram'],
  ['brandTone', 'Tono de marca'],
  ['brandColors', 'Colores'],
  ['targetAudience', 'Público objetivo'],
  ['services', 'Servicios o productos'],
  ['competitors', 'Competencia'],
  ['contentNotes', 'Notas de contenido'],
];

/** True si la configuración tiene algo útil para precargar. */
export function hasBrandData(src: BrandSource): boolean {
  return LINES.some(([k]) => String(src[k] ?? '').trim()) || src.brandDocContent.trim().length > 0;
}

/** Texto de perfil de marca a partir de la configuración guardada en Automatización. */
export function brandFromConfig(src: BrandSource): string {
  const parts = LINES.flatMap(([k, label]) => {
    const v = String(src[k] ?? '').trim();
    return v ? [`${label}: ${v}`] : [];
  });
  const doc = src.brandDocContent.trim();
  if (doc) {
    const title = src.brandDocName.trim() ? `Documento de marca (${src.brandDocName.trim()})` : 'Documento de marca';
    parts.push(`\n${title}:\n${doc}`);
  }
  const text = parts.join('\n');
  return text.length > MAX_BRAND_TEXT ? `${text.slice(0, MAX_BRAND_TEXT - 1).trimEnd()}…` : text;
}
