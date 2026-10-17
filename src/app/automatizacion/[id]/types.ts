import type { TriggerType, WorkflowStep } from '@/lib/automations/types';
import type { ConfigMap } from './step-model';

export interface DetailRun {
  id: string;
  status: string;
  error: string | null;
  createdAt: string;
}

export interface WorkflowDetail {
  id: string;
  name: string;
  description: string | null;
  folderId: string | null;
  status: string;
  trigger: { type: TriggerType; config: ConfigMap };
  steps: WorkflowStep[];
  runs: DetailRun[];
}

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'notfound' }
  | { kind: 'error'; message: string };
