'use client';

import React from 'react';
import { Gauge } from 'lucide-react';
import { usageLevel } from '@/lib/voice/cost';
import type { UsageSummary } from '@/lib/voice/usage';
import { pct, usd } from './format';
import type { VoiceStatusResponse } from './types';

interface Props {
  usage: UsageSummary | undefined;
  cost: VoiceStatusResponse['cost'];
  /** Tope definido en los ajustes de voz (el del entorno siempre manda). */
  workspaceCapUsd: number;
}

const LEVEL_TEXT = {
  ok: 'Consumo dentro del tope.',
  warn: 'Ya usaste más del 80 % del tope mensual.',
  cap: 'Tope alcanzado: no actives ni amplíes la voz hasta subirlo o esperar al próximo mes.',
} as const;

/** Uso y costo del mes contra el tope. Las cifras son ESTIMADAS salvo el costo que reporta el proveedor. */
export function UsageCard({ usage, cost, workspaceCapUsd }: Props) {
  const cap = Math.min(workspaceCapUsd > 0 ? workspaceCapUsd : cost.capUsd, cost.capUsd);
  const spent = usage?.spentUsd ?? 0;
  const { ratio, level } = usageLevel(spent, cap);

  return (
    <section className="card vz-card" aria-labelledby="vz-use-title">
      <div className="vz-card-head">
        <h2 id="vz-use-title" className="vz-h2"><Gauge size={16} color="var(--ag-voice)" aria-hidden="true" /> Uso del mes</h2>
        <span className="ag-pill">Estimado</span>
      </div>

      <div className="vz-usage-top">
        <span className="vz-usage-value">{usd(spent)}</span>
        <span className="muted">de {usd(cap)} de tope</span>
      </div>
      <div className="vz-meter" role="progressbar" aria-label="Gasto del mes contra el tope" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct(ratio)} data-level={level}>
        <div className="vz-meter-bar" style={{ ['--p' as string]: Math.min(1, ratio) }} />
      </div>
      <p className="vz-level" data-level={level}>{LEVEL_TEXT[level]}</p>

      <dl className="vz-stats">
        <div><dt>Llamadas</dt><dd>{usage?.calls ?? 0}</dd></div>
        <div><dt>Minutos</dt><dd>{usage?.minutes ?? 0}</dd></div>
        <div><dt>Costo por minuto</dt><dd>~{usd(cost.perMinuteUsd)}</dd></div>
        <div><dt>Minutos hasta el tope</dt><dd>~{cost.minutesAtCap}</dd></div>
      </dl>
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        Incluye motor de voz, modelo de lenguaje y telefonía entrante{usage && usage.numberUsd > 0 ? `, más ${usd(usage.numberUsd)} del número` : ''}. El proveedor puede cobrar distinto: confirma en su factura.
      </p>
    </section>
  );
}
