export type StageId = 'nuevo' | 'contacto' | 'consulta' | 'propuesta' | 'negociacion' | 'reserva';

export interface Stage {
  id: StageId;
  label: string;
  /** Color de acento de la columna (dato de la etapa, no del tema). */
  color: string;
  /** Probabilidad de cierre (%) usada en el pronóstico. */
  probability: number;
}

export const PIPELINE_NAME = 'Embudo de Ventas Principal';

export const STAGES: readonly Stage[] = [
  { id: 'nuevo', label: 'Nuevo Lead', color: '#5b8def', probability: 10 },
  { id: 'contacto', label: 'Contacto Inicial', color: '#3fb89a', probability: 20 },
  { id: 'consulta', label: 'Consulta / Cotización', color: '#a78bfa', probability: 35 },
  { id: 'propuesta', label: 'Propuesta Enviada', color: '#f87171', probability: 55 },
  { id: 'negociacion', label: 'En Negociación', color: '#fb923c', probability: 75 },
  { id: 'reserva', label: 'Reserva Confirmada', color: '#e0a04a', probability: 95 },
];

export function stageById(id: StageId): Stage {
  return STAGES.find((s) => s.id === id) ?? STAGES[0] ?? { id: 'nuevo', label: 'Nuevo Lead', color: '#5b8def', probability: 10 };
}

export function isStageId(value: string): value is StageId {
  return STAGES.some((s) => s.id === value);
}
