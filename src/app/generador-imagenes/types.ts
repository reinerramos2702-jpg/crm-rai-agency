export interface ThemeSummary {
  title?: string;
  category?: string;
  /** La lista solo informa si el tema ya tiene copy; el texto completo vive en el wizard. */
  hasCopy?: boolean;
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

// ---------- Wizard ([id]) ----------

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ThemeEntry {
  title: string;
  category: string;
  segment?: string;
  /** Copy final del día (caption con hashtags). Se guarda dentro del JSON `themes`. */
  caption?: string;
}

export interface Asset {
  id: string;
  themeIndex: number;
  slideNumber: number;
  prompt: string | null;
  publicUrl: string;
  createdAt: string;
}

export type LlmProviderId = 'deepseek' | 'anthropic' | 'google' | 'openai';

export interface ContentGrid {
  id: string;
  name: string;
  status: string;
  currentStep: number;
  activeThemeIndex: number;
  themesTotal: number;
  imageProvider: string;
  llmProvider: string | null;
  llmModel: string | null;
  chatHistory: ChatMessage[];
  themes: ThemeEntry[];
  assets: Asset[];
}
