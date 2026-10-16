/** Preferencias de vista del módulo Automatización (se guardan en el navegador de cada persona). */

export type FlowSort = 'recientes' | 'nombre' | 'ejecuciones';
export type DisplayZone = 'America/Caracas' | 'local';
export type AutoRefreshSeconds = 0 | 30 | 60;

export interface AutomationPrefs {
  flowSort: FlowSort;
  showDescriptions: boolean;
  displayZone: DisplayZone;
  activityRefresh: AutoRefreshSeconds;
  nameTemplate: string;
}

export const PREFS_STORAGE_KEY = 'rai-auto-prefs-v1';
export const DEFAULT_NAME_TEMPLATE = '{nombre}';

export const DEFAULT_PREFS: AutomationPrefs = {
  flowSort: 'recientes',
  showDescriptions: true,
  displayZone: 'America/Caracas',
  activityRefresh: 0,
  nameTemplate: DEFAULT_NAME_TEMPLATE,
};

const FLOW_SORTS: FlowSort[] = ['recientes', 'nombre', 'ejecuciones'];
const ZONES: DisplayZone[] = ['America/Caracas', 'local'];
const REFRESH: AutoRefreshSeconds[] = [0, 30, 60];

/** Lee el JSON guardado descartando cualquier valor inválido (se usa el predeterminado de ese campo). */
export function parsePrefs(raw: string | null): AutomationPrefs {
  if (!raw) return DEFAULT_PREFS;
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PREFS;
    data = parsed as Record<string, unknown>;
  } catch {
    return DEFAULT_PREFS;
  }
  const template = typeof data.nameTemplate === 'string' ? data.nameTemplate.trim().slice(0, 80) : '';
  return {
    flowSort: FLOW_SORTS.find((v) => v === data.flowSort) ?? DEFAULT_PREFS.flowSort,
    showDescriptions: typeof data.showDescriptions === 'boolean' ? data.showDescriptions : DEFAULT_PREFS.showDescriptions,
    displayZone: ZONES.find((v) => v === data.displayZone) ?? DEFAULT_PREFS.displayZone,
    activityRefresh: REFRESH.find((v) => v === data.activityRefresh) ?? DEFAULT_PREFS.activityRefresh,
    nameTemplate: template.includes('{nombre}') ? template : DEFAULT_PREFS.nameTemplate,
  };
}

export function serializePrefs(prefs: AutomationPrefs): string {
  return JSON.stringify(prefs);
}

/** Aplica la plantilla de nombre: `{nombre}` es el nombre base y `{fecha}` la fecha de hoy. */
export function applyNameTemplate(template: string, baseName: string, now = new Date()): string {
  const date = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  return template.replaceAll('{nombre}', baseName).replaceAll('{fecha}', date).trim() || baseName;
}

export function zoneOption(zone: DisplayZone): string | undefined {
  return zone === 'local' ? undefined : zone;
}

export function sortFlows<T extends { name: string; updatedAt: string; runsCount: number; _count?: { runs: number } }>(
  flows: T[],
  sort: FlowSort
): T[] {
  if (sort === 'recientes') return flows;
  const copy = [...flows];
  if (sort === 'nombre') return copy.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const runs = (f: T) => f._count?.runs ?? f.runsCount ?? 0;
  return copy.sort((a, b) => runs(b) - runs(a) || a.name.localeCompare(b.name, 'es'));
}
