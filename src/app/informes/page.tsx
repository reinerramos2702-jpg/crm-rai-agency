'use client';

import React, { useState } from 'react';
import { BarChart3, RotateCw, TriangleAlert, Plus } from 'lucide-react';
import { ScrollTabs } from '@/components/module-kit/ScrollTabs';
import { DisabledAction } from '@/components/module-kit/DisabledAction';
import { NoticeBand } from '@/components/module-kit/NoticeBand';
import { panelDomId, tabDomId } from '@/components/module-kit/tabs-nav';
import { useCachedJson } from '@/lib/use-cached-json';
import { DEFAULT_PERIOD, type DashboardSummary } from '@/lib/dashboard-summary';
import { GhostChart } from './_components/GhostChart';
import { KpiGrid, KpiGridSkeleton } from './_components/KpiGrid';
import { ReportsToolbar } from './_components/ReportsToolbar';
import { allEmpty, buildKpiCards, periodText, timeText, type DashPeriod } from './_components/report-model';
import { REPORT_TABS, reportTabById } from './_components/report-tabs';
import './_components/informes.css';

const PREFIX = 'rp';
// Número de reportes guardados: todavía no existe API ni modelo para crearlos.
const SAVED_REPORTS = 0;

export default function InformesPage() {
  const [tabId, setTabId] = useState<string>(REPORT_TABS[0].id);
  const [days, setDays] = useState<DashPeriod>(DEFAULT_PERIOD);
  const tab = reportTabById(tabId);
  const { data, error, loading, refresh, revalidating } = useCachedJson<DashboardSummary>(`/api/dashboard/summary?days=${days}`);

  const cards = buildKpiCards(data?.kpis, tab.kpis);
  const updated = timeText(data?.generatedAt);

  return (
    <div className="container rp-page">
      <header className="rp-head">
        <div className="rp-head-main">
          <span className="rp-head-icon" aria-hidden="true">
            <BarChart3 size={20} />
          </span>
          <div>
            <h1 className="h1">Informes</h1>
            <p className="muted rp-sub">Reportes, métricas y análisis de tu negocio.</p>
          </div>
          <span className="badge badge-muted rp-count">{SAVED_REPORTS} reportes</span>
        </div>
        <DisabledAction
          variant="primary"
          icon={Plus}
          label="Crear reporte"
          align="end"
          reason="Los reportes guardados y personalizados llegarán en próximas iteraciones. Hoy puedes consultar las cifras de solo lectura."
        />
      </header>

      <ScrollTabs tabs={REPORT_TABS} active={tab.id} onChange={setTabId} label="Tipos de informe" idPrefix={PREFIX} />

      <ReportsToolbar days={days} onDays={setDays} />

      <section id={panelDomId(PREFIX)} role="tabpanel" aria-labelledby={tabDomId(PREFIX, tab.id)} tabIndex={0} className="rp-panel">
        <div className="rp-panel-head">
          <div className="rp-panel-title">
            <h2>{tab.label}</h2>
            <span className="badge badge-success">Datos reales</span>
          </div>
          <p className="muted">
            {tab.description} Mostrando los {periodText(days)}
            {updated ? `, actualizado a las ${updated}` : ''}.
          </p>
        </div>

        {loading && <KpiGridSkeleton count={tab.kpis.length} />}

        {error && !data && (
          <div className="card rp-error" role="alert">
            <TriangleAlert size={18} aria-hidden="true" />
            <div>
              <strong>No pudimos cargar las cifras</strong>
              <p>Revisa tu conexión e inténtalo de nuevo.</p>
            </div>
            <button type="button" className="secondary btn-sm" onClick={() => void refresh()} disabled={revalidating}>
              <RotateCw size={14} aria-hidden="true" /> Reintentar
            </button>
          </div>
        )}

        {data && <KpiGrid cards={cards} days={days} />}
        {data && allEmpty(cards) && (
          <p className="rp-empty-note">Todavía no hay actividad en este periodo. Cuando empieces a operar, las cifras aparecerán aquí.</p>
        )}

        <NoticeBand>
          Las tarjetas son cifras reales de solo lectura. Los gráficos marcados «Ejemplo ilustrativo» no usan datos de tu cuenta.
        </NoticeBand>

        <GhostChart kind={tab.ghost.kind} title={tab.ghost.title} text={tab.ghost.text} />
      </section>
    </div>
  );
}
