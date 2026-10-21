import { briefToContext, type CampaignBrief } from './campaign-brief';

export interface DayInventory {
  dayNumber: number;
  hasContent: boolean;
  existingAssets: Array<{ name: string; type: string }>;
}

export interface CompetitorInsights {
  painPoints: string[];
  opportunities: string[];
  toneAnalysis: string;
  rawSummary: string;
}

export interface ContextInput {
  brandInput: string;
  inventory: DayInventory[];
  inventoryPath: string;
  adsLibrary: { adsFound: number } | null;
  adsLibraryBrand: string;
  competitorInsights: CompetitorInsights | null;
  imageProvider: string;
  brief: CampaignBrief;
}

/** Contexto que se agrega al prompt de sistema: marca, inventario, investigación, configuración y brief. */
export function buildContextSuffix(c: ContextInput): string {
  let ctx = '';
  if (c.brandInput.trim()) {
    ctx += `\n\n[PERFIL DE MARCA PROPORCIONADO]\n${c.brandInput}`;
  }
  if (c.inventory.length > 0) {
    const withContent = c.inventory.filter((d) => d.hasContent);
    ctx += `\n\n[INVENTARIO LOCAL]\nCarpeta: ${c.inventoryPath}\nDías con assets existentes: ${withContent.map((d) => `Día ${d.dayNumber}`).join(', ') || 'ninguno'}\nTotal carpetas: ${c.inventory.length}`;
  }
  if (c.adsLibrary) {
    ctx += `\n\n[ANÁLISIS META ADS LIBRARY: ${c.adsLibraryBrand}]\nAnuncios encontrados: ${c.adsLibrary.adsFound}`;
  }
  if (c.competitorInsights) {
    ctx += `\n\n[ANÁLISIS COMPETENCIA]\nInsights: ${c.competitorInsights.rawSummary.slice(0, 300)}`;
  }
  if (c.imageProvider !== 'gemini') {
    ctx += `\n\n[CONFIGURACIÓN]\nProveedor de imágenes: ${c.imageProvider}`;
  }
  ctx += briefToContext(c.brief);
  return ctx;
}
