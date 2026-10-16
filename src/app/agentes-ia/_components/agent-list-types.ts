export interface AgentListItem {
  id: string;
  name: string;
  status: string;
  isPrimary: boolean;
  kind: string;
  channels: string[];
  llmProvider: string;
  llmModel: string;
  updatedAt: string;
  _count?: { conversations: number; triggers: number };
}
