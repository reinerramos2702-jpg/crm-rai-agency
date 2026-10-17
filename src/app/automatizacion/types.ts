import type { LucideIcon } from 'lucide-react';
import { Activity, Instagram, LayoutTemplate, ListChecks, Settings as SettingsIcon } from 'lucide-react';
import type { WorkflowStep, WorkflowTrigger } from '@/lib/automations/types';

export interface TabDef {
  id: TopTab;
  label: string;
  icon: LucideIcon;
}

export type TopTab = 'flujos' | 'plantillas' | 'contenido-ig' | 'actividad' | 'configuracion';

export const TOP_TABS: TabDef[] = [
  { id: 'flujos', label: 'Flujos', icon: ListChecks },
  { id: 'plantillas', label: 'Plantillas', icon: LayoutTemplate },
  { id: 'contenido-ig', label: 'Contenido IG', icon: Instagram },
  { id: 'actividad', label: 'Actividad', icon: Activity },
  { id: 'configuracion', label: 'Configuración', icon: SettingsIcon },
];

export function isTopTab(value: string | null | undefined): value is TopTab {
  return TOP_TABS.some((t) => t.id === value);
}

export interface FolderT {
  id: string;
  name: string;
}

export interface WorkflowT {
  id: string;
  name: string;
  description: string | null;
  status: string;
  folderId: string | null;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  runsCount: number;
  lastRunAt: string | null;
  updatedAt: string;
  _count?: { runs: number };
  /** Cómo terminó la ejecución más reciente (la calcula el servidor). */
  lastRunStatus?: string | null;
}

export interface AutomationsPayload {
  folders: FolderT[];
  workflows: WorkflowT[];
  automationsEnabled?: boolean;
}

export interface RunLogEntry {
  step: string;
  ok: boolean;
  detail: string;
}

export interface RunT {
  id: string;
  workflowId: string;
  status: string;
  contactId: string | null;
  contactName: string | null;
  trigger: { type: string | null } | null;
  result: { log: RunLogEntry[] } | null;
  error: string | null;
  createdAt: string;
  workflow: { id: string; name: string };
}

export interface RunsPayload {
  runs: RunT[];
  nextCursor: string | null;
  /** Ejecuciones del periodo por estado (solo en la primera página). */
  summary?: Record<string, number>;
}

export interface SettingsT {
  automationsEnabled: boolean;
  automationNotifyEmail: string | null;
  n8nWebhookUrl: string | null;
}

export interface SettingsPayload {
  settings: Partial<SettingsT> | null;
}

export const AUTOMATIONS_URL = '/api/automations';
export const SETTINGS_URL = '/api/settings';
export const RUNS_PAGE_SIZE = 25;
export const RUNS_URL = `/api/automations/runs?limit=${RUNS_PAGE_SIZE}`;
