import { prisma } from '@/lib/db';
import { parseStoredConfig } from '@/lib/content-planner-config';
import {
  brandChecklist,
  brandScore,
  mergePalette,
  parseBrandProfile,
  type ChecklistItem,
  type ParsedBrandProfile,
} from '@/lib/marketing-brand';

export interface BrandSnapshot {
  configured: boolean;
  businessName: string;
  businessType: string;
  businessLocation: string;
  businessWebsite: string;
  igHandle: string;
  brandTone: string;
  brandColorsText: string;
  targetAudience: string;
  services: string;
  rulesCount: number;
  doc: { name: string | null; updatedAt: string | null; hasDoc: boolean; charCount: number; excerpt: string };
  profile: ParsedBrandProfile;
  palette: string[];
  checklist: ChecklistItem[];
  score: number;
}

/** Lee la marca del workspace activo (solo lectura). `withDocText` trae el texto del documento para extraer paleta y extracto. */
export async function loadBrandSnapshot(workspaceId: string, withDocText: boolean): Promise<BrandSnapshot> {
  const [ws, settings] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { brandProfile: true, brandDocName: true, brandDocUpdatedAt: true, brandDocText: withDocText },
    }),
    prisma.settings.findUnique({ where: { workspaceId }, select: { contentPlannerConfig: true } }),
  ]);
  const stored = settings?.contentPlannerConfig ?? null;
  const cfg = parseStoredConfig(stored);
  const profile = parseBrandProfile(ws?.brandProfile ?? null);
  const docText = withDocText ? (ws?.brandDocText ?? '') : '';
  const docName = ws?.brandDocName ?? (cfg.brandDocName.trim() || null);
  const hasDoc = !!ws?.brandDocName || !!cfg.brandDocName.trim() || cfg.brandDocContent.trim().length > 0;
  const hasProfile = ws?.brandProfile != null && typeof ws.brandProfile === 'object' && Object.keys(ws.brandProfile as object).length > 0;

  const checklist = brandChecklist({
    configured: stored !== null,
    businessName: cfg.businessName,
    brandTone: cfg.brandTone,
    brandColors: cfg.brandColors,
    targetAudience: cfg.targetAudience,
    services: cfg.services,
    igHandle: cfg.igHandle,
    rulesCount: cfg.brandRules.length,
    hasDoc,
    hasProfile,
  });

  return {
    configured: stored !== null,
    businessName: cfg.businessName,
    businessType: cfg.businessType,
    businessLocation: cfg.businessLocation,
    businessWebsite: cfg.businessWebsite,
    igHandle: cfg.igHandle,
    brandTone: stored !== null ? cfg.brandTone : '',
    brandColorsText: cfg.brandColors,
    targetAudience: cfg.targetAudience,
    services: cfg.services,
    rulesCount: cfg.brandRules.length,
    doc: {
      name: docName,
      updatedAt: ws?.brandDocUpdatedAt ? ws.brandDocUpdatedAt.toISOString() : null,
      hasDoc,
      charCount: docText.length,
      excerpt: docText.replace(/\s+/g, ' ').trim().slice(0, 360),
    },
    profile,
    palette: mergePalette(profile.colors, cfg.brandColors, docText),
    checklist,
    score: brandScore(checklist),
  };
}
