import type { ContentPlannerConfig } from '@/lib/content-planner-config';

export type CampaignStatus = 'planning' | 'generating' | 'review' | 'scheduled' | 'publishing' | 'completed';
export type ContentType = 'carousel' | 'reel' | 'post';
export type DayStatus = 'pending' | 'generated' | 'approved' | 'published' | 'failed';

export interface ContentDay {
  day: number;
  date: string;
  type: ContentType;
  pillar: string;
  hook: string;
  caption: string;
  cta: string;
  hashtags: string;
  status: DayStatus;
  imageFile?: string;
}

export interface Campaign {
  id: string;
  name: string;
  folderName: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  totalPieces: number;
  published: number;
  model: string;
  days: ContentDay[];
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const IG_VIEWS = ['campaigns', 'planner', 'calendar', 'config'] as const;
export type IgView = (typeof IG_VIEWS)[number];

export function isIgView(value: unknown): value is IgView {
  return IG_VIEWS.some((v) => v === value);
}

/** Cambia un campo de la configuración del planificador. */
export type ConfigSetter = <K extends keyof ContentPlannerConfig>(key: K, value: ContentPlannerConfig[K]) => void;

export interface ConfigSection {
  id: string;
  label: string;
  done: boolean;
  hint: string;
}
