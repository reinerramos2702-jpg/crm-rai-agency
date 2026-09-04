'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Sparkles, Inbox, Zap, ArrowRight, RefreshCw } from 'lucide-react';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { HotelKpiPanel } from '@/components/dashboard/HotelKpiPanel';
import { TopBar } from '@/components/layout/TopBar';
import toast from 'react-hot-toast';

const CACHE_KEY_CAMPAIGNS = 'rai_dash_campaigns_v1';
const CACHE_KEY_AUTOMATIONS = 'rai_dash_automations_v1';
const FETCH_TIMEOUT_MS = 8000;

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
  // Cache instantáneo: pinta lo último conocido mientras refresca en background.
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => readCache<Campaign[]>(CACHE_KEY_CAMPAIGNS) || []);
  const [loading, setLoading] = useState(() => readCache<Campaign[]>(CACHE_KEY_CAMPAIGNS) === null);
  const [hasFetched, setHasFetched] = useState(false);
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>(() => readCache<AutomationWorkflow[]>(CACHE_KEY_AUTOMATIONS) || []);
  const [loadingAutomations, setLoadingAutomations] = useState(() => readCache<AutomationWorkflow[]>(CACHE_KEY_AUTOMATIONS) === null);

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
    loadCampaigns();
    loadAutomations();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta campaña? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        toast.success('Campaña eliminada');
      } else {
        toast.error('Error eliminando campaña');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  // Calcular estadísticas
  const total = campaigns.length;
  const completed = campaigns.filter((c) => c.status === 'done').length;
  const processing = campaigns.filter((c) =>
    ['processing', 'ready'].includes(c.status)
  ).length;
  const failed = campaigns.filter((c) => c.status === 'failed').length;

  // Ordenar por fecha más reciente
  const sorted = [...campaigns].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const activeWorkflows = workflows.filter((w) => w.status === 'active').length;
  const totalRuns = workflows.reduce((acc, w) => acc + (w._count?.runs || 0), 0);

  return (
    <>
      <TopBar
        title="CRM RAI Agency"
        subtitle="Dashboard de campañas de contenido automatizado"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                loadCampaigns();
                loadAutomations();
              }}
              className="btn btn-ghost btn-sm"
              title="Recargar"
              style={{ marginRight: 8 }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
            <Link href="/campaign/new" className="btn btn-primary">
              <PlusCircle size={16} />
              Nueva Campaña
            </Link>
          </>
        }
      />

      <div className="container">
        {/* Panel KPIs hotel + alertas operativas */}
        <HotelKpiPanel />

        {/* Resumen de Automatización */}
        {!loadingAutomations && (
          <Link
            href="/automatizacion"
            className="card mb-4"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              textDecoration: 'none',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(201,168,76,0.1)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Zap size={18} color="var(--rai-gold)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--rai-text)' }}>
                  Automatización
                </div>
                {workflows.length === 0 ? (
                  <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Aún no tienes flujos de automatización. Activa el primero desde una plantilla.
                  </p>
                ) : (
                  <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {activeWorkflows} flujo{activeWorkflows === 1 ? '' : 's'} activo{activeWorkflows === 1 ? '' : 's'} de {workflows.length} ·{' '}
                    {totalRuns} ejecución{totalRuns === 1 ? '' : 'es'} registrada{totalRuns === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            </div>
            <span className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
              {workflows.length === 0 ? 'Configurar automatizaciones' : 'Ver automatizaciones'}
              <ArrowRight size={14} />
            </span>
          </Link>
        )}

        {/* Stats */}
        {!loading && total > 0 && (
          <StatsBar
            total={total}
            completed={completed}
            processing={processing}
            failed={failed}
          />
        )}

        {/* Título de sección */}
        {!loading && total > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--rai-text)' }}>
              Campañas ({total})
            </h2>
          </div>
        )}

        {/* Loading — skeleton grid (mucho mejor percepción de velocidad que un spinner) */}
        {loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="card skeleton-card"
                style={{ minHeight: 160, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="skeleton" style={{ height: 12, width: '70%', borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 4 }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height: 8, width: '100%', borderRadius: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <div className="skeleton" style={{ height: 10, width: 60, borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 24, width: 90, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estado vacío */}
        {!loading && total === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 420,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <Inbox size={36} color="var(--rai-gold-dim)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--rai-text)', marginBottom: 8 }}>
              No hay campañas aún
            </h2>
            <p style={{ color: 'var(--rai-muted)', fontSize: 14, marginBottom: 28, maxWidth: 360, lineHeight: 1.6 }}>
              Crea tu primera campaña y la IA generará hasta 31 días de contenido automatizado,
              listo para publicar en Instagram.
            </p>
            <Link href="/campaign/new" className="btn btn-primary btn-lg">
              <Sparkles size={18} />
              Crear primera campaña
            </Link>
          </div>
        )}

        {/* Grid de campañas */}
        {!loading && sorted.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {sorted.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
