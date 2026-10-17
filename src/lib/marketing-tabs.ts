/** Pestañas de /marketing: definición pura (sin iconos) y lectura segura del parámetro `?tab=`. */

export type MarketingTabId =
  | 'social'
  | 'emails'
  | 'snippets'
  | 'countdown'
  | 'links'
  | 'brand'
  | 'ads'
  | 'prospecting';

export interface MarketingTabDef {
  id: MarketingTabId;
  label: string;
  /** Resumen de una línea bajo la barra de pestañas. */
  description: string;
}

export const MARKETING_TABS: readonly MarketingTabDef[] = [
  { id: 'social', label: 'Planificador de Redes', description: 'Calendario de tus publicaciones programadas, con su estado real y los días sin contenido.' },
  { id: 'emails', label: 'Correos Electrónicos', description: 'Plantillas listas para personalizar, previsualizar y copiar a tu proveedor de correo.' },
  { id: 'snippets', label: 'Fragmentos', description: 'Textos reutilizables con variables como {{nombre}} y {{empresa}}.' },
  { id: 'countdown', label: 'Cuenta Atrás', description: 'Genera un temporizador de urgencia con vista previa y código para pegar en tu página.' },
  { id: 'links', label: 'Enlaces de Activación', description: 'Enlaces cortos que cuentan clics y redirigen a su destino.' },
  { id: 'brand', label: 'Paneles de Marca', description: 'La ficha de tu marca: colores, tono, documento y qué falta por completar.' },
  { id: 'ads', label: 'Administrador de Anuncios', description: 'Investiga los anuncios de la competencia y arma enlaces con UTM para tus campañas.' },
  { id: 'prospecting', label: 'Prospección', description: 'Analiza sitios de la competencia para detectar quejas, temas y oportunidades.' },
] as const;

export const DEFAULT_MARKETING_TAB: MarketingTabId = 'social';

export function isMarketingTab(v: unknown): v is MarketingTabId {
  return typeof v === 'string' && MARKETING_TABS.some((t) => t.id === v);
}

/** Cualquier valor desconocido cae en la pestaña por defecto. */
export function parseMarketingTab(v: string | null | undefined): MarketingTabId {
  return isMarketingTab(v) ? v : DEFAULT_MARKETING_TAB;
}

/** Ruta de una pestaña; la pestaña por defecto no lleva parámetro. */
export function marketingTabHref(id: MarketingTabId): string {
  return id === DEFAULT_MARKETING_TAB ? '/marketing' : `/marketing?tab=${id}`;
}
