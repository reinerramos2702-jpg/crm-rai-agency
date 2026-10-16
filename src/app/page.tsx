'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Sparkles, Zap, ArrowRight, RefreshCw, Search, HelpCircle, Layers, Instagram, Bot } from 'lucide-react';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { HotelKpiPanel } from '@/components/dashboard/HotelKpiPanel';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { InstagramPulse } from '@/components/dashboard/InstagramPulse';
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog';
import ProductTour, { type TourStep } from '@/components/pipeline-ig/ProductTour';
import { TopBar } from '@/components/layout/TopBar';
import toast from 'react-hot-toast';

const CACHE_KEY_CAMPAIGNS = 'rai_dash_campaigns_v1';
const CACHE_KEY_AUTOMATIONS = 'rai_dash_automations_v1';
const FETCH_TIMEOUT_MS = 8000;
const TOUR_KEY = 'rai-tour-dash-v1';

type Filter = 'all' | 'running' | 'done' | 'failed' | 'planning';
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'running', label: 'En proceso' },
  { id: 'done', label: 'Completadas' },
  { id: 'failed', label: 'Con errores' },
  { id: 'planning', label: 'Planificando' },
];
function matchesFilter(status: string, f: Filter): boolean {
  if (f === 'all') return true;
  if (f === 'running') return ['processing', 'ready', 'running', 'queued'].includes(status);
  if (f === 'done') return ['done', 'completed'].includes(status);
  if (f === 'failed') return status === 'failed';
  return status === 'planning';
}

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // QuotaExceeded u otra: ignorar
  }
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface Campaign {
  id: string;
  name: string;
  pipelineType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { executions: number };
  executions: Array<{
    id: string;
    status: string;
    tasks: Array<{ status: string }>;
  }>;
}

interface AutomationWorkflow {
  id: string;
  name: string;
  status: string;
  _count: { runs: number };
}

/**
 * Dashboard principal: grilla de campañas con estadísticas y acción rápida.
 */
export default function DashboardPage() {
  // Estado inicial idéntico en servidor y cliente (evita errores de hidratación);
  // el caché local se aplica justo después de montar y pinta lo último conocido mientras se refresca.
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [loadingAutomations, setLoadingAutomations] = useState(true);
  const [me, setMe] = useState<{ displayName: string | null; workspaceName: string | null } | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  async function loadCampaigns(silent = false) {
    if (!silent) setLoading((prev) => prev && !hasFetched);
    try {
      const res = await fetchWithTimeout('/api/campaigns', FETCH_TIMEOUT_MS);
      if (!res.ok) throw new Error('Error cargando campañas');
      const data = await res.json();
      const list: Campaign[] = data.campaigns || [];
      setCampaigns(list);
      writeCache(CACHE_KEY_CAMPAIGNS, list);
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      if (!silent) toast.error(aborted ? 'La carga tardó demasiado' : 'No se pudieron cargar las campañas');
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }

  async function loadAutomations() {
    try {
      const res = await fetchWithTimeout('/api/automations', FETCH_TIMEOUT_MS);
      if (!res.ok) throw new Error('Error cargando automatizaciones');
      const data = await res.json();
      const list: AutomationWorkflow[] = data.workflows || [];
      setWorkflows(list);
      writeCache(CACHE_KEY_AUTOMATIONS, list);
    } catch {
      // Silencioso: el resumen de automatización es complementario.
    } finally {
      setLoadingAutomations(false);
    }
  }

  useEffect(() => {
    const cachedCampaigns = readCache<Campaign[]>(CACHE_KEY_CAMPAIGNS);
    if (cachedCampaigns) { setCampaigns(cachedCampaigns); setLoading(false); }
    const cachedFlows = readCache<AutomationWorkflow[]>(CACHE_KEY_AUTOMATIONS);
    if (cachedFlows) { setWorkflows(cachedFlows); setLoadingAutomations(false); }
    loadCampaigns();
    loadAutomations();
    fetchWithTimeout('/api/me', FETCH_TIMEOUT_MS)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setMe({ displayName: d.displayName ?? null, workspaceName: d.workspaceName ?? null }); })
      .catch(() => { /* el saludo funciona sin nombre */ });
  }, []);

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

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${toDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns((prev) => {
          const next = prev.filter((c) => c.id !== toDelete.id);
          writeCache(CACHE_KEY_CAMPAIGNS, next);
          return next;
        });
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

  // Estadísticas
  const total = campaigns.length;
  const completed = campaigns.filter((c) => ['done', 'completed'].includes(c.status)).length;
  const processing = campaigns.filter((c) => ['processing', 'ready'].includes(c.status)).length;
  const failed = campaigns.filter((c) => c.status === 'failed').length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...campaigns]
      .filter((c) => matchesFilter(c.status, filter) && (!q || c.name.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [campaigns, query, filter]);

  const activeWorkflows = workflows.filter((w) => w.status === 'active').length;
  const totalRuns = workflows.reduce((acc, w) => acc + (w._count?.runs || 0), 0);

  const tourSteps: TourStep[] = [
    { id: 'welcome', title: 'Tu panel de control', body: 'En 30 segundos ves qué hay en cada zona. Puedes repetirlo con "Ver recorrido".' },
    { id: 'actions', target: '[data-tour="dash-actions"]', placement: 'bottom', title: 'Accesos rápidos', body: 'Lo que más usas, a un clic: nueva campaña, Instagram, calendarios y conversaciones.' },
    { id: 'ig', target: '[data-tour="dash-ig"]', placement: 'bottom', title: 'Instagram, hoy', body: 'Cuántas publicaciones hay programadas y cuándo sale la siguiente. Si algo falla, te avisa aquí.' },
    { id: 'auto', target: '[data-tour="dash-auto"]', placement: 'bottom', title: 'Automatización', body: 'Flujos que trabajan solos: recordatorios, seguimientos, bienvenidas. Se activan desde plantillas.' },
    ...(total > 0
      ? [
          { id: 'stats', target: '[data-tour="dash-stats"]', placement: 'bottom' as const, title: 'Resumen de campañas', body: 'Cuántas están completas, en proceso o con errores. La barrita muestra su peso sobre el total.' },
          { id: 'list', target: '[data-tour="dash-list"]', placement: 'top' as const, title: 'Tus campañas', body: 'Busca por nombre o filtra por estado. Entra a una para ver sus días y publicarlos.' },
        ]
      : [{ id: 'empty', target: '[data-tour="dash-empty"]', placement: 'top' as const, title: 'Empieza aquí', body: 'Crea tu primera campaña: la IA arma hasta 31 días de contenido listo para Instagram.' }]),
    { id: 'done', title: '¡Listo!', body: 'El menú de la izquierda te lleva a cada módulo. Aquí siempre verás lo importante primero.' },
  ];

  return (
    <>
      <TopBar
        title="CRM RAI Agency"
        subtitle="Dashboard de campañas de contenido automatizado"
        actions={
          <>
            <button type="button" className="rai-help-btn dash-tour-btn" onClick={() => setTourOpen(true)} title="Ver el recorrido guiado">
              <HelpCircle size={15} /> <span>Ver recorrido</span>
            </button>
            <button
              type="button"
              onClick={() => { loadCampaigns(); loadAutomations(); }}
              className="btn btn-ghost btn-sm"
              title="Recargar"
              aria-label="Recargar datos"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link href="/campaign/new" className="btn btn-primary" data-tour="dash-new">
              <PlusCircle size={16} />
              <span className="dash-btn-label">Nueva Campaña</span>
            </Link>
          </>
        }
      />

      <div className="container rai-page rai-stage dash-page">
        <DashboardHero displayName={me?.displayName ?? null} workspaceName={me?.workspaceName ?? null} campaigns={total} activeFlows={activeWorkflows} />

        {/* Instagram + Automatización: dos tarjetas lado a lado (una columna en móvil) */}
        <div className="dash-duo">
          <InstagramPulse />
          {!loadingAutomations && (
            <Link href="/automatizacion" className="dash-auto" data-tour="dash-auto">
              <div className="dash-auto-head">
                <span className="dash-pulse-ico"><Zap size={17} /></span>
                <div>
                  <h3>Automatización</h3>
                  <p>{workflows.length === 0 ? 'Sin flujos todavía. Activa el primero desde una plantilla.' : 'Flujos que trabajan por ti'}</p>
                </div>
              </div>
              {workflows.length > 0 && (
                <div className="dash-pulse-nums">
                  <div style={{ '--sc': 'var(--rai-gold)' } as React.CSSProperties}><strong>{activeWorkflows}</strong><span>activos</span></div>
                  <div style={{ '--sc': 'var(--rai-muted)' } as React.CSSProperties}><strong>{workflows.length}</strong><span>en total</span></div>
                  <div style={{ '--sc': 'var(--rai-purple)' } as React.CSSProperties}><strong>{totalRuns}</strong><span>ejecuciones</span></div>
                </div>
              )}
              <span className="dash-link">{workflows.length === 0 ? 'Configurar automatizaciones' : 'Ver automatizaciones'} <ArrowRight size={13} /></span>
            </Link>
          )}
        </div>

        {/* Panel hotel (solo si hay datos; si no, una línea descartable) */}
        <HotelKpiPanel />

        {!loading && total > 0 && <StatsBar total={total} completed={completed} processing={processing} failed={failed} />}

        {/* Campañas */}
        {!loading && total > 0 && (
          <div className="dash-toolbar" data-tour="dash-list">
            <h2>Campañas <span>{visible.length === total ? total : `${visible.length} de ${total}`}</span></h2>
            <label className="dash-search">
              <Search size={14} aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar campaña…" aria-label="Buscar campaña" />
            </label>
            <div className="dash-chips" role="group" aria-label="Filtrar por estado">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" className={`dash-chip${filter === f.id ? ' is-on' : ''}`} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="dash-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="dash-camp" aria-hidden="true">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
                  <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                    <div className="skeleton" style={{ height: 12, width: '70%', borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 4 }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height: 8, width: '100%', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        )}

        {/* Estado vacío guiado */}
        {!loading && total === 0 && (
          <section className="dash-empty" data-tour="dash-empty">
            <span className="dash-empty-ico"><Layers size={30} /></span>
            <h2>Crea tu primera campaña</h2>
            <p>La IA genera hasta 31 días de contenido listo para publicar en Instagram.</p>
            <ol className="dash-empty-steps">
              <li><b>1</b> Cuéntale tu negocio</li>
              <li><b>2</b> La IA arma el plan</li>
              <li><b>3</b> Aprueba y programa</li>
            </ol>
            <div className="dash-empty-cta">
              <Link href="/campaign/new" className="btn btn-primary btn-lg"><Sparkles size={18} /> Crear primera campaña</Link>
              <Link href="/automatizacion" className="dash-link"><Instagram size={13} /> o planear directo en Contenido IG</Link>
            </div>
          </section>
        )}

        {!loading && total > 0 && visible.length === 0 && (
          <p className="dash-noresults"><Bot size={16} /> Ninguna campaña coincide. <button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Limpiar filtros</button></p>
        )}

        {!loading && visible.length > 0 && (
          <div className="dash-grid">
            {visible.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} onDelete={() => setToDelete(campaign)} />
            ))}
          </div>
        )}
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
