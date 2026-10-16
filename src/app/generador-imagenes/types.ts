export interface ThemeSummary {
  title?: string;
  category?: string;
}

export interface ContentGridSummary {
  id: string;
  name: string;
  status: string;
  currentStep: number;
  activeThemeIndex: number;
  themesTotal: number;
  imageProvider: string;
  themes: ThemeSummary[];
  createdAt: string;
  updatedAt: string;
  _count: { assets: number };
}

export interface BrandDocInfo {
  brandDocName: string | null;
  brandDocText: string | null;
  brandDocUpdatedAt: string | null;
  hasBrandDoc: boolean;
}

export const EMPTY_BRAND_DOC: BrandDocInfo = {
  brandDocName: null,
  brandDocText: null,
  brandDocUpdatedAt: null,
  hasBrandDoc: false,
};
