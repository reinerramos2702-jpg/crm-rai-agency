'use client';

import React from 'react';
import { Calendar, FolderOpen, HelpCircle, Settings, Sparkles, type LucideIcon } from 'lucide-react';
import { handleTabKeys } from '@/app/automatizacion/tab-keys';
import { IG_VIEWS, type IgView } from './types';

const ITEMS: Array<{ key: IgView; label: string; Icon: LucideIcon }> = [
  { key: 'campaigns', label: 'Mis campañas', Icon: FolderOpen },
  { key: 'planner', label: 'Planear contenido', Icon: Sparkles },
  { key: 'calendar', label: 'Calendario', Icon: Calendar },
  { key: 'config', label: 'Marca y cuenta', Icon: Settings },
];

interface SubNavProps {
  view: IgView;
  configPending: boolean;
  onChange: (view: IgView) => void;
  onTour: () => void;
}

export function SubNav({ view, configPending, onChange, onTour }: SubNavProps) {
  return (
    <div className="rai-subnav-row">
      <div className="rai-subnav" role="tablist" aria-label="Contenido de Instagram" data-tour="subnav" onKeyDown={(e) => handleTabKeys(e, IG_VIEWS, view, onChange, (id) => `ig-tab-${id}`)}>
        {ITEMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`ig-tab-${key}`}
            aria-selected={view === key}
            aria-controls="ig-panel"
            tabIndex={view === key ? 0 : -1}
            className={`rai-subnav-btn ${view === key ? 'is-on' : ''}`}
            onClick={() => onChange(key)}
          >
            <Icon size={15} aria-hidden="true" /> <span>{label}</span>
            {key === 'config' && configPending && <span className="rai-dot" role="img" aria-label="Configuración pendiente" />}
          </button>
        ))}
      </div>
      <button type="button" className="rai-help-btn" onClick={onTour} title="Ver el recorrido guiado">
        <HelpCircle size={15} aria-hidden="true" /> <span>Ver recorrido</span>
      </button>
    </div>
  );
}
