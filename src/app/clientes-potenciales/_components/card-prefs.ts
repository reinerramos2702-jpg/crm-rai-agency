export type CardDesign = 'default' | 'compact' | 'unlabeled';

export type CardFieldId = 'tags' | 'owner' | 'business' | 'source' | 'value' | 'closeDate';

export interface CardPrefs {
  design: CardDesign;
  fields: Record<CardFieldId, boolean>;
}

export const CARD_FIELDS: readonly { id: CardFieldId; label: string }[] = [
  { id: 'tags', label: 'Etiquetas' },
  { id: 'owner', label: 'Propietario de la oportunidad' },
  { id: 'business', label: 'Nombre del negocio' },
  { id: 'source', label: 'Fuente' },
  { id: 'value', label: 'Valor' },
  { id: 'closeDate', label: 'Fecha de cierre estimada' },
];

export const DESIGN_LABELS: Record<CardDesign, string> = {
  default: 'Por defecto',
  compact: 'Compacto',
  unlabeled: 'Sin etiquetar',
};

export const DEFAULT_PREFS: CardPrefs = {
  design: 'default',
  fields: { tags: true, owner: true, business: true, source: true, value: true, closeDate: true },
};

export const PREFS_KEY = 'rai-pipeline-card-v1';

function isDesign(value: unknown): value is CardDesign {
  return value === 'default' || value === 'compact' || value === 'unlabeled';
}

/** Lee preferencias guardadas (JSON) tolerando datos corruptos o incompletos. */
export function parsePrefs(raw: string | null): CardPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return DEFAULT_PREFS;
    const design = 'design' in data && isDesign(data.design) ? data.design : DEFAULT_PREFS.design;
    const stored = 'fields' in data && typeof data.fields === 'object' && data.fields !== null ? data.fields : {};
    const fields = { ...DEFAULT_PREFS.fields };
    for (const { id } of CARD_FIELDS) {
      if (id in stored) {
        const flag: unknown = Reflect.get(stored, id);
        if (typeof flag === 'boolean') fields[id] = flag;
      }
    }
    return { design, fields };
  } catch {
    return DEFAULT_PREFS;
  }
}
