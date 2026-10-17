import { BarChart3, FileText, Link2, MessageSquare, Settings, Zap, type LucideIcon } from 'lucide-react';
import type { TopTabId } from '../_lib/conv-types';

export const TOP_TABS: Array<{ id: TopTabId; label: string; icon: LucideIcon }> = [
  { id: 'chat', label: 'Conversaciones', icon: MessageSquare },
  { id: 'manual', label: 'Acciones Manuales', icon: Zap },
  { id: 'snippets', label: 'Fragmentos', icon: FileText },
  { id: 'links', label: 'Enlaces de Activación', icon: Link2 },
  { id: 'analytics', label: 'Analítica', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', icon: Settings },
];
