import {
  Activity,
  Bot,
  Building2,
  CheckSquare,
  CreditCard,
  FileText,
  StickyNote,
  Target,
  type LucideIcon,
} from 'lucide-react';

export type RailTabId = 'docs' | 'pagos' | 'notas' | 'tareas' | 'leads' | 'companies' | 'activity' | 'agent';

export interface RailTabDef {
  id: RailTabId;
  label: string;
  icon: LucideIcon;
  empty: string;
}

export const RAIL_TABS: RailTabDef[] = [
  { id: 'docs', label: 'Documentos', icon: FileText, empty: 'Todavía no hay documentos. Sube o envía documentos para verlos aquí.' },
  { id: 'pagos', label: 'Pagos', icon: CreditCard, empty: 'Aún no hay transacciones. Crea un nuevo pago ahora.' },
  { id: 'notas', label: 'Notas', icon: StickyNote, empty: 'Todavía no hay notas. Mantén un registro de detalles importantes.' },
  { id: 'tareas', label: 'Tareas', icon: CheckSquare, empty: 'Todavía no hay tareas. Mantén la organización creando tu primera tarea.' },
  { id: 'leads', label: 'Clientes Potenciales', icon: Target, empty: 'Todavía no hay clientes potenciales. Crea o vincula una oportunidad.' },
  { id: 'companies', label: 'Asociaciones', icon: Building2, empty: 'No hay empresas asociadas a este contacto.' },
  { id: 'activity', label: 'Actividad', icon: Activity, empty: 'Aún no hay actividades. Visitas, formularios y citas aparecerán aquí.' },
  { id: 'agent', label: 'Agent Logs', icon: Bot, empty: 'No se encontraron registros de agente IA.' },
];

export const DEFAULT_RAIL_TAB: RailTabId = 'notas';

export function railTab(id: RailTabId): RailTabDef {
  return RAIL_TABS.find((t) => t.id === id) ?? RAIL_TABS[0];
}
