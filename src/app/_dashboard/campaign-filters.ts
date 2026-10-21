export type CampaignFilter = 'all' | 'running' | 'done' | 'failed' | 'planning';

export const CAMPAIGN_FILTERS: Array<{ id: CampaignFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'running', label: 'En proceso' },
  { id: 'done', label: 'Completadas' },
  { id: 'failed', label: 'Con errores' },
  { id: 'planning', label: 'Planificando' },
];

export function matchesCampaignFilter(status: string, f: CampaignFilter): boolean {
  if (f === 'all') return true;
  if (f === 'running') return ['processing', 'ready', 'running', 'queued'].includes(status);
  if (f === 'done') return ['done', 'completed'].includes(status);
  if (f === 'failed') return status === 'failed';
  return status === 'planning';
}
