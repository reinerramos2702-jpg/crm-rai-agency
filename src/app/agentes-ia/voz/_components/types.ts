import type { PublicVoiceConfig } from '@/lib/voice/config';
import type { VoiceCostEstimate } from '@/lib/voice/cost';
import type { CallListItem } from '@/lib/voice/queries';
import type { ChecklistItem, StepSummary } from '@/lib/voice/status';
import type { UsageSummary } from '@/lib/voice/usage';

export interface VoiceAgentRow {
  id: string;
  name: string;
  status: string;
  isPrimary: boolean;
  knowledgeBases: number;
  providerName: string;
}

export interface VoiceStatusResponse {
  workspaceId: string;
  mode: 'simulated' | 'live';
  requestedMode: 'simulated' | 'live';
  items: ChecklistItem[];
  steps: StepSummary[];
  missingEnv: string[];
  envReady: boolean;
  webhookUrl: string | null;
  config: PublicVoiceConfig;
  agents: VoiceAgentRow[];
  callsTotal: number;
  cost: {
    estimado: true;
    perMinuteUsd: number;
    numberUsdPerMonth: number;
    capUsd: number;
    minutesAtCap: number;
    sample: VoiceCostEstimate;
  };
}

export interface VoiceCallsResponse {
  mode: 'simulated' | 'live';
  calls: CallListItem[];
  nextCursor: string | null;
  usage: UsageSummary;
  costEstimate: VoiceCostEstimate;
}

export interface SyncResponse {
  mode: 'simulated' | 'live';
  synced: boolean;
  providerAgentId?: string;
  preview: null | {
    language: string;
    voiceSpeed: number;
    beginMessage: string;
    tools: string[];
    promptChars: number;
    maxCallMinutes: number;
    webhookUrl: string | null;
  };
  issues?: string[];
  error?: string;
  errors?: Array<string | { field: string; message: string }>;
}
