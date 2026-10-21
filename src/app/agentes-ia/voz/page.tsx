'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Phone, Settings2, LayoutDashboard } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useCachedJson } from '@/lib/use-cached-json';
import { NEW_VOICE_HREF } from '../_components/NewAgentButtons';
import { TestChatPanel } from '../_components/TestChat';
import { ActivationCard } from './_components/ActivationCard';
import { CallsList } from './_components/CallsList';
import { SettingsPanel } from './_components/SettingsPanel';
import { UsageCard } from './_components/UsageCard';
import { useVoiceSettings } from './_components/use-voice-settings';
import type { VoiceCallsResponse, VoiceStatusResponse } from './_components/types';
import type { CallListItem } from '@/lib/voice/queries';

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'ajustes', label: 'Ajustes de voz', icon: Settings2 },
  { id: 'probar', label: 'Probar', icon: FlaskConical },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function CentroDeVozPage() {
  const [tab, setTab] = useState<TabId>('resumen');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [extra, setExtra] = useState<CallListItem[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  // Estado y llamadas se piden a la vez al abrir la página; ambas usan la caché compartida.
  const status = useCachedJson<VoiceStatusResponse>('/api/voice/status', { ttlMs: 20_000 });
  const calls = useCachedJson<VoiceCallsResponse>('/api/voice/calls?limit=20', { ttlMs: 20_000 });
  const st = status.data;
  const { settings, setSettings, save } = useVoiceSettings(st?.workspaceId);

  useEffect(() => {
    if (!st || agentId) return;
    const first = st.agents.find((a) => a.isPrimary) ?? st.agents[0];
    if (first) setAgentId(first.id);
  }, [st, agentId]);

  const agent = useMemo(() => st?.agents.find((a) => a.id === agentId) ?? null, [st, agentId]);
  const nextCursor = cursor === undefined ? calls.data?.nextCursor ?? null : cursor;
  const allCalls = useMemo(() => (calls.data ? [...calls.data.calls, ...extra] : undefined), [calls.data, extra]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/voice/calls?limit=20&cursor=${encodeURIComponent(nextCursor)}`, { credentials: 'same-origin' });
      if (res.ok) {
        const data: VoiceCallsResponse = await res.json();
        setExtra((prev) => [...prev, ...data.calls]);
        setCursor(data.nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor]);

  return (
    <div className="container vz">
      <div className="ag-head">
        <div className="ag-head-text">
          <Link href="/agentes-ia" className="muted ag-wiz-back"><ArrowLeft size={14} aria-hidden="true" /> Agentes de IA</Link>
          <h1 className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Phone size={24} color="var(--ag-voice)" aria-hidden="true" /> Centro de voz
          </h1>
          <p className="muted">Activa el agente por teléfono, controla el gasto y revisa cada llamada. Por defecto todo corre en modo simulado, sin costo.</p>
        </div>
        <div className="ag-head-actions">
          <Link href={NEW_VOICE_HREF} className="ag-btn ag-btn--voice"><Phone size={14} aria-hidden="true" /> Nuevo agente de voz</Link>
        </div>
      </div>

      <div className="ag-tabs" role="tablist" aria-label="Secciones del centro de voz">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} id={`vz-tab-${id}`} role="tab" type="button" className="ag-tab" aria-selected={tab === id} aria-controls={`vz-panel-${id}`} onClick={() => setTab(id)}>
            <Icon size={15} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {st && st.agents.length > 1 && (
        <div className="ag-field" style={{ maxWidth: 360 }}>
          <label className="label" htmlFor="vz-agent">Agente de voz</label>
          <select id="vz-agent" className="input" value={agentId ?? ''} onChange={(e) => setAgentId(e.target.value)}>
            {st.agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.isPrimary ? ' (principal)' : ''}</option>)}
          </select>
        </div>
      )}

      {status.error && !st && <p className="vz-err" role="alert">No se pudo cargar el estado de la voz: {status.error}</p>}
      {!st && !status.error && <div className="vz-grid"><SkeletonCard lines={4} /><SkeletonCard lines={3} /></div>}

      {st && st.agents.length === 0 && (
        <EmptyState
          icon={Phone}
          title="Aún no tienes un agente de voz"
          text="Crea uno con el asistente: en cinco pasos defines voz, guion, base de conocimiento y reglas de llamada. Luego vuelve aquí a activarlo."
          action={<Link href={NEW_VOICE_HREF} className="ag-btn ag-btn--accent">Crear agente de voz</Link>}
        />
      )}

      {st && (
        <>
          <div id="vz-panel-resumen" role="tabpanel" aria-labelledby="vz-tab-resumen" hidden={tab !== 'resumen'}>
            <div className="vz-grid">
              <ActivationCard status={st} agent={agent} settings={settings} onSaveSettings={save} />
              <UsageCard usage={calls.data?.usage} cost={st.cost} workspaceCapUsd={settings.monthlyCapUsd} />
            </div>
            <div className="vz-block">
              <CallsList calls={allCalls} loading={calls.loading} error={calls.error} hasMore={!!nextCursor} loadingMore={loadingMore} onMore={loadMore} />
            </div>
          </div>

          <div id="vz-panel-ajustes" role="tabpanel" aria-labelledby="vz-tab-ajustes" hidden={tab !== 'ajustes'}>
            <SettingsPanel settings={settings} onChange={setSettings} onSave={save} envCapUsd={st.config.monthlyCapUsd} />
          </div>

          <div id="vz-panel-probar" role="tabpanel" aria-labelledby="vz-tab-probar" hidden={tab !== 'probar'}>
            {agent ? (
              <div className="vz-test">
                <TestChatPanel agentId={agent.id} variant="voice" />
                <p className="muted" style={{ fontSize: 13 }}>
                  Es una simulación en texto del guion, las reglas y la base de conocimiento: no usa telefonía ni genera costo.
                  {st.mode === 'live' ? ' Para probar con voz real, llama al número una vez activado el agente.' : ''}
                  {' '}La llamada de prueba desde el navegador necesita el SDK web de Retell (dependencia nueva pendiente de aprobación).
                </p>
              </div>
            ) : (
              <p className="muted">Crea un agente de voz para poder probarlo.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
