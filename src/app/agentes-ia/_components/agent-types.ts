import { Settings as SettingsIcon, BookOpen, Target } from 'lucide-react';
import { PROVIDER_NAMES } from '@/lib/llm-provider-names';

export const LLM_PROVIDERS = [
  { provider: 'openai', label: PROVIDER_NAMES.openai, models: [{ id: 'gpt-4o', label: 'GPT-4o' }, { id: 'gpt-4o-mini', label: 'GPT-4o mini' }] },
  { provider: 'anthropic', label: PROVIDER_NAMES.anthropic, models: [{ id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' }, { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' }] },
  { provider: 'google', label: PROVIDER_NAMES.google, models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }, { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }] },
  { provider: 'deepseek', label: PROVIDER_NAMES.deepseek, models: [{ id: 'deepseek-chat', label: 'DeepSeek Chat' }, { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }] },
] as const;

export const SUB_TABS = [
  { id: 'config', label: 'Configuración del Bot', icon: SettingsIcon },
  { id: 'entrenamiento', label: 'Entrenamiento del bot', icon: BookOpen },
  { id: 'objetivos', label: 'Objetivos del bot', icon: Target },
] as const;

export type SubTab = (typeof SUB_TABS)[number]['id'];

export const CHAT_CHANNEL_OPTIONS = [
  'Widget de chat (SMS chat)',
  'Chat en tiempo real',
  'WhatsApp',
  'Instagram',
  'Email',
  'SMS',
];
export const VOICE_CHANNEL_OPTIONS = ['Llamadas de voz'];

export interface TriggerT {
  id: string;
  triggerCondition: string | null;
  knowledgeBase: { id: string; name: string; description: string | null; _count?: { items: number } };
}

export interface AgentDetail {
  id: string;
  name: string;
  status: string;
  isPrimary: boolean;
  kind: string;
  channels: string[];
  llmProvider: string;
  llmModel: string;
  personality: string | null;
  objective: string | null;
  additionalInfo: string | null;
  welcomeMessage: string | null;
  fallbackMessage: string | null;
  avgSecondsPerMessage: number;
  createdAt: string;
  updatedAt: string;
  triggers: TriggerT[];
  _count?: { conversations: number };
}

export interface KBSummary {
  id: string;
  name: string;
  description: string | null;
  _count?: { items: number; triggers: number };
}

export const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  suggested: 'badge-gold',
  disabled: 'badge-muted',
};

export const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  suggested: 'Sugerido',
  disabled: 'Apagado',
};
