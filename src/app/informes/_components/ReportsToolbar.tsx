'use client';

import React from 'react';
import { ArrowUpDown, Columns3, Search, SlidersHorizontal } from 'lucide-react';
import { DisabledAction } from '@/components/module-kit/DisabledAction';
import { DASH_PERIODS, type DashPeriod } from './report-model';

interface ReportsToolbarProps {
  days: DashPeriod;
  onDays: (d: DashPeriod) => void;
}

const SOON = 'Disponible junto con los reportes guardados, en próximas iteraciones.';

/** Selector de periodo (real) y herramientas de reportes guardados (aún no disponibles, con motivo). */
export function ReportsToolbar({ days, onDays }: ReportsToolbarProps) {
  return (
    <div className="rp-toolbar">
      <div className="rp-period" role="group" aria-label="Periodo de las cifras">
        {DASH_PERIODS.map((d) => (
          <button key={d} type="button" className="rp-period-btn" aria-pressed={d === days} onClick={() => onDays(d)}>
            {d} días
          </button>
        ))}
      </div>
      <div className="rp-tools" role="group" aria-label="Herramientas de reportes (próximamente)">
        <DisabledAction small icon={SlidersHorizontal} label="Filtros avanzados" reason={SOON} />
        <DisabledAction small icon={ArrowUpDown} label="Ordenar" reason={SOON} />
        <DisabledAction small icon={Search} label="Buscar" reason={SOON} />
        <DisabledAction small icon={Columns3} label="Administrar campos" reason={SOON} align="end" />
      </div>
    </div>
  );
}
