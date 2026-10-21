'use client';

import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { BATCH_SIZES, DEFAULT_BATCH, estimateCampaignCost, formatUsd } from '@/lib/campaign-cost';

interface LiveCostProps {
  pipelineType: string;
  modelId: string;
  imageProvider: string;
  /** Campaña reabierta con plan ya generado: permite pedir el estimado real al servidor. */
  serverCampaignId: string | null;
}

interface ServerEstimateData {
  estimatedUsd: number;
  hardCap: number;
  withinCap: boolean;
}

/** Estimado oficial del servidor: solo existe cuando el plan maestro ya se generó. */
function ServerEstimate({ campaignId }: { campaignId: string }) {
  const { data } = useCachedJson<ServerEstimateData>(`/api/cost-estimate?campaignId=${encodeURIComponent(campaignId)}`, {
    ttlMs: 60_000,
  });
  if (!data) return null;
  return (
    <p className={`cn-cost-server${data.withinCap ? '' : ' is-over'}`} role="status">
      Plan generado: <strong>{formatUsd(data.estimatedUsd)}</strong> (tope {formatUsd(data.hardCap)})
      {data.withinCap ? '' : ' · supera el tope'}
    </p>
  );
}

/** Costo estimado siempre visible: se recalcula al cambiar pipeline, modelo, imágenes o tamaño del lote. */
export function LiveCost({ pipelineType, modelId, imageProvider, serverCampaignId }: LiveCostProps) {
  const [pieces, setPieces] = useState<number>(DEFAULT_BATCH);
  const est = estimateCampaignCost({ pipelineType, modelId, imageProvider, pieces });

  return (
    <section className="cn-cost" aria-label="Costo estimado" data-tour="cn-cost">
      <div className="cn-cost-head">
        <span className="cn-cost-title">
          <DollarSign size={14} aria-hidden="true" /> Costo estimado
        </span>
        <div className="cn-seg" role="group" aria-label="Tamaño del lote">
          {BATCH_SIZES.map((n) => (
            <button key={n} type="button" aria-pressed={pieces === n} onClick={() => setPieces(n)}>
              {n} días
            </button>
          ))}
        </div>
      </div>
      <p className="cn-cost-total" aria-live="polite">
        ~{formatUsd(est.totalUsd)} <span>USD · {formatUsd(est.perPieceUsd)} por pieza</span>
      </p>
      <details className="cn-cost-details">
        <summary>Ver desglose</summary>
        <ul>
          {est.lines.map((l) => (
            <li key={l.id}>
              <span>{l.label}</span>
              <span>{formatUsd(l.usd)}</span>
            </li>
          ))}
        </ul>
        <p className="cn-hint" style={{ marginTop: 8 }}>
          Aproximado y con precios de referencia. El costo real puede variar según el modelo y el proveedor.
        </p>
      </details>
      {serverCampaignId && <ServerEstimate campaignId={serverCampaignId} />}
    </section>
  );
}
