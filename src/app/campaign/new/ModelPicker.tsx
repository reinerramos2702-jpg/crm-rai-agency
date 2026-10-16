'use client';

import { COST_TIER_LABELS, PROVIDERS, SPEED_LABELS, modelInfo, modelsOf } from '@/lib/campaign-new-options';

interface ModelPickerProps {
  provider: string;
  modelId: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (modelId: string) => void;
}

/** Medidor de 4 puntos: se lee igual sin color (texto asociado). */
function Meter({ level, max }: { level: number; max: number }) {
  return (
    <span className="cn-meter" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < level ? 'is-on' : undefined} />
      ))}
    </span>
  );
}

/** Selección de proveedor y modelo con costo y velocidad relativos, y una línea que explica la diferencia. */
export function ModelPicker({ provider, modelId, onProviderChange, onModelChange }: ModelPickerProps) {
  const info = modelInfo(modelId);
  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
        <select value={provider} onChange={(e) => onProviderChange(e.target.value)} style={{ width: '100%' }} aria-label="Proveedor de IA">
          {PROVIDERS.map((p) => (
            <option key={p.provider} value={p.provider}>{p.label}</option>
          ))}
        </select>
        <select value={modelId} onChange={(e) => onModelChange(e.target.value)} style={{ width: '100%' }} aria-label="Modelo">
          {modelsOf(provider).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="cn-model-info" role="status">
        <div className="cn-chip-row">
          <span className="cn-chip" title="Costo relativo del modelo">
            <Meter level={info.cost} max={4} />
            Costo: {COST_TIER_LABELS[info.cost]}
          </span>
          <span className="cn-chip" title="Velocidad de respuesta relativa">
            <Meter level={info.speed} max={3} />
            Velocidad: {SPEED_LABELS[info.speed]}
          </span>
        </div>
        <p className="cn-hint">{info.blurb}</p>
      </div>
    </>
  );
}
