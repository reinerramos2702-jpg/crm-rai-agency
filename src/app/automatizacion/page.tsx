'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, HelpCircle, Zap } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { prefetchJson } from '@/lib/swr-cache';
import type { TourStep } from '@/components/pipeline-ig/ProductTour';
import ActivityTab from './tabs/ActivityTab';
import FlowsTab from './tabs/FlowsTab';
import SettingsTab from './tabs/SettingsTab';
import TemplatesTab from './tabs/TemplatesTab';
import { PAGE_TOUR_KEY, PAGE_TOUR_STEPS } from './tour-steps';
import { RUNS_URL, TOP_TABS, isTopTab, type TopTab } from './types';
import { useAutomationSettings } from './use-automation-settings';
import { useAutomations } from './use-automations';
import './automation.css';

const ContentIGTab = dynamic(() => import('@/components/pipeline-ig/ContentIGTab'), {
  ssr: false,
  loading: () => <SkeletonCard lines={4} />,
});
const ProductTour = dynamic(() => import('@/components/pipeline-ig/ProductTour'), { ssr: false });

export default function AutomatizacionPage() {
  const [topTab, setTopTab] = useState<TopTab>('flujos');
  const [folderFilter, setFolderFilter] = useState('all');
  const [pageTourOpen, setPageTourOpen] = useState(false);
  const data = useAutomations();
  const settings = useAutomationSettings();

  useEffect(() => {
    const readTab = () => {
      const tab = new URLSearchParams(window.location.search).get('tab');
      setTopTab(isTopTab(tab) ? tab : 'flujos');
    };
    readTab();
    window.addEventListener('popstate', readTab);
    return () => window.removeEventListener('popstate', readTab);
  }, []);

  const selectTab = useCallback((tab: TopTab) => {
    setTopTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'flujos') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab);
    window.history.replaceState(window.history.state, '', url);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => prefetchJson(RUNS_URL, 15_000), 500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(PAGE_TOUR_KEY) === 'done'; } catch { /* sin storage */ }
    if (seen) return;
    const t = window.setTimeout(() => setPageTourOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const onTourStep = (step: TourStep) => {
    if (isTopTab(step.view)) setTopTab(step.view);
  };
  const closeTour = () => {
    try { localStorage.setItem(PAGE_TOUR_KEY, 'done'); } catch { /* sin storage */ }
    setPageTourOpen(false);
    selectTab('flujos');
  };

  const activeCount = data.workflows.filter((w) => w.status === 'active').length;
  const totalRuns = data.workflows.reduce((sum, w) => sum + (w._count?.runs ?? w.runsCount ?? 0), 0);
  const paused = settings.settings !== null && !settings.settings.automationsEnabled;

  return (
    <div className={`container rai-page au-page${topTab !== 'contenido-ig' ? ' rai-stage' : ''}`}>
      <div className="mb-6 row-between rai-page-head">
        <div>
          <h1 className="h1 au-title"><Zap size={24} color="var(--rai-gold)" /> Automatización</h1>
          <p className="muted">
            Diseña flujos que reaccionan a eventos del CRM (nuevos contactos, citas, etiquetas) o que corren en
            segundo plano según el calendario, sin tocar una sola línea de código.
          </p>
        </div>
        <div className="row rai-page-stats" data-tour="auto-stats">
          {topTab !== 'contenido-ig' && (
            <button type="button" className="rai-help-btn" onClick={() => setPageTourOpen(true)} title="Ver el recorrido guiado de Automatización">
              <HelpCircle size={15} /> <span>Ver recorrido</span>
            </button>
          )}
          <div className="au-stat">
            <div className="au-stat-value is-gold">{data.loading ? <span className="au-stat-skel fx-shimmer" aria-hidden="true" /> : activeCount}</div>
            <div className="au-stat-label">Flujos activos</div>
          </div>
          <div className="au-stat">
            <div className="au-stat-value">{data.loading ? <span className="au-stat-skel fx-shimmer" aria-hidden="true" /> : totalRuns}</div>
            <div className="au-stat-label">Ejecuciones totales</div>
          </div>
        </div>
      </div>

      {paused && (
        <div className="au-banner" role="status">
          <AlertTriangle size={20} aria-hidden="true" />
          <div className="au-banner-text">
            <strong>La automatización está pausada globalmente</strong>
            <p>Ningún flujo se ejecutará (aunque esté «Activo») hasta que la reactives en Configuración.</p>
          </div>
          <button type="button" className="au-btn au-btn--primary" onClick={() => selectTab('configuracion')}>Ir a Configuración</button>
        </div>
      )}

      <div className="au-tabs rai-toptabs" role="tablist" aria-label="Áreas de Automatización" data-tour="auto-tabs">
        {TOP_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`au-tab-${id}`}
            aria-selected={topTab === id}
            aria-controls="au-panel"
            data-tour={`tab-${id}`}
            className="au-tab"
            onClick={() => selectTab(id)}
            onMouseEnter={id === 'actividad' ? () => prefetchJson(RUNS_URL, 15_000) : undefined}
          >
            <Icon size={15} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div id="au-panel" role="tabpanel" aria-labelledby={`au-tab-${topTab}`}>
        {topTab === 'flujos' && (
          <FlowsTab data={data} folderFilter={folderFilter} onFolderFilter={setFolderFilter} onGoTemplates={() => selectTab('plantillas')} />
        )}
        {topTab === 'plantillas' && <TemplatesTab createWorkflow={data.createWorkflow} />}
        {topTab === 'actividad' && <ActivityTab workflows={data.workflows} />}
        {topTab === 'contenido-ig' && <ContentIGTab />}
        {topTab === 'configuracion' && (
          <SettingsTab settings={settings.settings} loading={settings.loading} save={settings.save} data={data} />
        )}
      </div>

      {pageTourOpen && <ProductTour steps={PAGE_TOUR_STEPS} open onClose={closeTour} onStep={onTourStep} />}
    </div>
  );
}
