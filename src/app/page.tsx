'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, RefreshCw, HelpCircle, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { HotelKpiPanel } from '@/components/dashboard/HotelKpiPanel';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
import ProductTour, { type TourStep } from '@/components/pipeline-ig/ProductTour';
import { TopBar } from '@/components/layout/TopBar';
import { useDashJson } from '@/lib/dashboard-client';
import { DEFAULT_PERIOD, parsePeriod, todayHeadline, type DashPeriod, type DashboardSummary } from '@/lib/dashboard-summary';
import { DASH_PINS_KEY, DEFAULT_PINS, canOpen, parsePins } from '@/lib/dashboard-pins';
import { SHORTCUT_HINTS, isTypingTarget, shortcutFor } from '@/lib/dashboard-shortcuts';
import { LAUNCHPAD_PREFS_KEY, parseLaunchpadPrefs } from '@/lib/launchpad-prefs';
import { LAUNCHPAD_STEPS } from '@/lib/launchpad-steps';
import { Hero } from './_dashboard/Hero';
import { QuickActions } from './_dashboard/QuickActions';
import { TodayBlock } from './_dashboard/TodayBlock';
import { KpiStrip } from './_dashboard/KpiStrip';
import { NextActionCard } from './_dashboard/NextActionCard';
import { InstagramCard, AutomationCard } from './_dashboard/ChannelCards';
import { ActivityFeed } from './_dashboard/ActivityFeed';
import { CampaignsSection, type DashCampaign } from './_dashboard/CampaignsSection';
import './_dashboard/dashboard.css';

const TOUR_KEY = 'rai-tour-dash-v1';
const PERIOD_KEY = 'rai-dash-period-v1';
const STEP_IDS = LAUNCHPAD_STEPS.map((s) => s.id);
// Último periodo elegido en esta sesión: al volver al Dashboard no hay parpadeo de esqueleto.
// (Vale null en el servidor y en la primera hidratación: el HTML inicial coincide.)
let lastDays: DashPeriod | null = null;

/** Dashboard: lo de hoy, indicadores del periodo, siguiente mejor acción y campañas. */
export default function DashboardPage() {
  const router = useRouter();
  // Todo lo que depende del navegador (hora, localStorage) se resuelve DESPUÉS de montar
  // para que el primer render coincida con el HTML del servidor.
  const [now, setNow] = useState<Date | null>(null);
  const [days, setDays] = useState<DashPeriod | null>(lastDays);
  const [pins, setPins] = useState<string[]>(DEFAULT_PINS);
  const [editingPins, setEditingPins] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<DashCampaign | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const summary = useDashJson<DashboardSummary>(days ? `/api/dashboard/summary?days=${days}` : null, {
    ttlMs: 10_000,
    persistKey: days ? `rai-dash-summary-${days}-v1` : undefined,
    maxAgeMs: 30 * 60_000,
  });
  const campaignsState = useDashJson<{ campaigns: DashCampaign[] }>('/api/campaigns', { ttlMs: 15_000, persistKey: 'rai-dash-campaigns-v2' });
  const launchpad = useDashJson<{ completed: string[] }>('/api/launchpad', { ttlMs: 15_000, persistKey: 'rai-dash-launchpad-v1' });

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    try { lastDays = parsePeriod(window.localStorage.getItem(PERIOD_KEY) ?? DEFAULT_PERIOD); } catch { lastDays = DEFAULT_PERIOD; }
    setDays(lastDays);
    try { setPins(parsePins(window.localStorage.getItem(DASH_PINS_KEY))); } catch { /* sin storage: accesos predeterminados */ }
    try { setSkipped(parseLaunchpadPrefs(window.localStorage.getItem(LAUNCHPAD_PREFS_KEY), STEP_IDS).skipped); } catch { /* sin storage */ }
    return () => window.clearInterval(timer);
  }, []);

  const changeDays = useCallback((d: DashPeriod) => {
    lastDays = d;
    setDays(d);
    try { window.localStorage.setItem(PERIOD_KEY, String(d)); } catch { /* sin storage */ }
  }, []);

  const changePins = useCallback((next: string[]) => {
    setPins(next);
    try { window.localStorage.setItem(DASH_PINS_KEY, JSON.stringify(next)); } catch { /* sin storage */ }
  }, []);

  const { refresh: refreshSummary } = summary;
  const { refresh: refreshCampaigns } = campaignsState;
  const { refresh: refreshLaunchpad } = launchpad;
  const refreshAll = useCallback(() => {
    void refreshSummary(true);
    void refreshCampaigns();
    void refreshLaunchpad();
  }, [refreshSummary, refreshCampaigns, refreshLaunchpad]);

  // Recorrido guiado: una sola vez por navegador.
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(TOUR_KEY) === 'done'; } catch { /* sin storage */ }
    if (seen) return;
    const t = window.setTimeout(() => setTourOpen(true), 1400);
    return () => window.clearTimeout(t);
  }, []);

  const closeTour = () => {
    try { localStorage.setItem(TOUR_KEY, 'done'); } catch { /* sin storage */ }
    setTourOpen(false);
  };

  const role = summary.data?.me.role ?? null;

  // Atajos de teclado discretos (no actúan al escribir ni con diálogos abiertos).
  const blocked = toDelete !== null || tourOpen;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = shortcutFor(e, { typing: isTypingTarget(document.activeElement as HTMLElement | null), blocked });
      if (!action) return;
      if (action === 'new-campaign') {
        if (!canOpen('/campaign/new', role)) return;
        e.preventDefault();
        router.push('/campaign/new');
      } else if (action === 'focus-search') {
        const input = document.querySelector<HTMLInputElement>('[data-dash-search]');
        if (!input) return;
        e.preventDefault();
        input.focus();
      } else if (action === 'refresh') {
        refreshAll();
      } else if (action === 'period-7') {
        changeDays(7);
      } else if (action === 'period-30') {
        changeDays(30);
      } else if (action === 'customize') {
        setEditingPins((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blocked, role, router, refreshAll, changeDays]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${toDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        const current = campaignsState.data?.campaigns ?? [];
        campaignsState.mutate({ campaigns: current.filter((c) => c.id !== toDelete.id) });
        toast.success('Campaña eliminada');
        setToDelete(null);
      } else {
        toast.error('Error eliminando campaña');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setDeleting(false);
    }
  }

  const data = summary.data;
  const periodKpis = data && data.days === days ? data.kpis : undefined;
  const campaigns = campaignsState.data?.campaigns;
  const noCampaigns = campaigns !== undefined && campaigns.length === 0;
  const summaryFailed = summary.error !== null && data === undefined;

  const tourSteps: TourStep[] = [
    { id: 'welcome', title: 'Tu panel de control', body: 'En 30 segundos ves qué hay en cada zona. Puedes repetirlo con "Ver recorrido".' },
    { id: 'actions', target: '[data-tour="dash-actions"]', placement: 'bottom', title: 'Accesos rápidos', body: 'Lo que más usas, a un clic. Tú decides cuáles quedan aquí:', hints: [
      { target: '[data-tour="dash-actions"] .dash-action:nth-child(1)', label: 'Pulsa un acceso para abrir ese módulo.' },
      { target: '[data-tour="dash-customize"]', label: 'Personalizar: fija, quita y reordena (atajo: P).' },
    ] },
    { id: 'today', target: '[data-tour="dash-today"]', placement: 'bottom', optional: true, title: 'Hoy', body: 'Citas, tareas, conversaciones sin responder, pagos por revisar y publicaciones de Instagram del día. Cada tarjeta lleva a su módulo.' },
    { id: 'kpis', target: '[data-tour="dash-kpis"]', placement: 'bottom', optional: true, title: 'Rendimiento', body: 'Cambia entre 7 y 30 días (atajos: 7 y 3). La etiqueta compara con el periodo anterior y las dos barras muestran actual y previo.' },
    { id: 'next', target: '[data-tour="dash-next"]', placement: 'top', optional: true, title: 'Siguiente mejor acción', body: 'El paso de la Guía de Inicio que más conviene hacer ahora, con su tiempo estimado.' },
    { id: 'ig', target: '[data-tour="dash-ig"]', placement: 'top', optional: true, title: 'Instagram', body: 'Cuántas publicaciones hay programadas y cuándo sale la siguiente. Si algo falla, te avisa aquí.' },
    { id: 'auto', target: '[data-tour="dash-auto"]', placement: 'top', optional: true, title: 'Automatización', body: 'Flujos que trabajan solos: recordatorios, seguimientos, bienvenidas. Se activan desde plantillas.' },
    noCampaigns
      ? { id: 'empty', target: '[data-tour="dash-empty"]', placement: 'top', optional: true, title: 'Empieza aquí', body: 'Crea tu primera campaña: la IA arma hasta 31 días de contenido listo para Instagram.' }
      : { id: 'list', target: '[data-tour="dash-list"]', placement: 'top', optional: true, title: 'Tus campañas', body: 'Busca por nombre o filtra por estado. Entra a una para ver sus días y publicarlos.' },
    { id: 'done', title: '¡Listo!', body: 'El menú de la izquierda te lleva a cada módulo. Aquí siempre verás lo importante primero.' },
  ];

  return (
    <>
      <TopBar
        title="CRM RAI Agency"
        subtitle="Tu día de un vistazo: lo urgente, tus números y tus campañas"
        actions={
          <>
            <button type="button" className="rai-help-btn dash-tour-btn" onClick={() => setTourOpen(true)} title="Ver el recorrido guiado">
              <HelpCircle size={15} /> <span>Ver recorrido</span>
            </button>
            <button type="button" onClick={refreshAll} className="btn btn-ghost btn-sm" title="Actualizar (R)" aria-label="Actualizar datos" disabled={summary.revalidating || campaignsState.revalidating}>
              <RefreshCw size={14} className={summary.revalidating ? 'animate-spin' : ''} />
            </button>
            <Link href="/campaign/new" className="btn btn-primary" data-tour="dash-new">
              <PlusCircle size={16} />
              <span className="dash-btn-label">Nueva Campaña</span>
            </Link>
          </>
        }
      />

      <div className="container rai-page rai-stage dash-page dsh-page">
        <Hero displayName={data?.me.displayName ?? null} workspaceName={data?.me.workspaceName ?? null} headline={todayHeadline(data?.today)} now={now} />

        <QuickActions pins={pins} role={role} editing={editingPins} onEditingChange={setEditingPins} onPinsChange={changePins} />

        {summaryFailed ? (
          <p className="dash-noresults">
            <Bot size={16} /> No se pudo cargar el resumen de hoy.
            <button type="button" onClick={() => void summary.refresh(true)}><RefreshCw size={12} /> Reintentar</button>
          </p>
        ) : (
          <>
            <TodayBlock today={data?.today} />
            <KpiStrip days={days ?? DEFAULT_PERIOD} onDays={changeDays} kpis={periodKpis} revalidating={summary.revalidating} onRefresh={refreshAll} />
          </>
        )}

        <div className="dsh-trio">
          {!(launchpad.error && !launchpad.data) && <NextActionCard completed={launchpad.data?.completed} skipped={skipped} />}
          <InstagramCard data={data?.instagram} loading={data === undefined && !summaryFailed} />
          <AutomationCard data={data?.automation} loading={data === undefined && !summaryFailed} />
        </div>

        <ActivityFeed items={summaryFailed ? null : data?.activity} now={now} />

        <HotelKpiPanel />

        <CampaignsSection
          campaigns={campaigns}
          failed={campaignsState.error !== null}
          onRetry={() => void campaignsState.refresh()}
          onDelete={setToDelete}
        />

        <p className="dsh-shortcuts" aria-label="Atajos de teclado">
          {SHORTCUT_HINTS.map((h) => (
            <span key={h.keys}><kbd>{h.keys}</kbd> {h.label}</span>
          ))}
        </p>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="¿Eliminar esta campaña?"
        body={<>Se eliminará <b>{toDelete?.name}</b> con todo su contenido generado. Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar campaña"
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <ProductTour steps={tourSteps} open={tourOpen} onClose={closeTour} />
    </>
  );
}
