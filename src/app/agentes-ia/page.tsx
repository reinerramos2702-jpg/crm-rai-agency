'use client';

import React, { useState } from 'react';
import { Bot, LayoutDashboard } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { Tablero } from './_components/Tablero';
import { AgentList } from './_components/AgentList';
import { NewAgentButtons } from './_components/NewAgentButtons';
import type { AgentListItem } from './_components/agent-list-types';

const TABS = [
  { id: 'tablero', label: 'Tablero', icon: LayoutDashboard },
  { id: 'agentes', label: 'Lista de agentes', icon: Bot },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AgentesIAPage() {
  const [tab, setTab] = useState<TabId>('tablero');
  // Ambas pestañas piden sus datos a la vez al abrir la página: cambiar de pestaña es instantáneo.
  const list = useCachedJson<{ agents: AgentListItem[] }>('/api/ai-agents', { ttlMs: 20_000 });
  const agents = list.data?.agents;

  return (
    <div className="container">
      <div className="ag-head">
        <div className="ag-head-text">
          <h1 className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bot size={24} color="var(--rai-gold)" aria-hidden="true" /> Agentes de IA
          </h1>
          <p className="muted">
            Centraliza tus agentes de chat y de voz: entrenamiento, bases de conocimiento y métricas de desempeño en un solo lugar.
          </p>
        </div>
        <NewAgentButtons />
      </div>

      <div className="ag-tabs" role="tablist" aria-label="Secciones de Agentes de IA">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`ag-tab-${id}`}
            role="tab"
            type="button"
            className="ag-tab"
            aria-selected={tab === id}
            aria-controls={`ag-panel-${id}`}
            onClick={() => setTab(id)}
          >
            <Icon size={15} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div id="ag-panel-tablero" role="tabpanel" aria-labelledby="ag-tab-tablero" hidden={tab !== 'tablero'}>
        <Tablero fallbackAgents={agents ?? []} />
      </div>
      <div id="ag-panel-agentes" role="tabpanel" aria-labelledby="ag-tab-agentes" hidden={tab !== 'agentes'}>
        <AgentList agents={agents} error={list.error} onChanged={() => void list.refresh()} />
      </div>
    </div>
  );
}
