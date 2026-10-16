'use client';

import React, { useState } from 'react';
import { FileText, Images, Send } from 'lucide-react';
import type { ExportPiece } from '@/lib/grid-export';
import type { Asset, ChatMessage, ThemeEntry } from '../types';
import { CopyPanel } from './CopyPanel';
import { OutputPanel } from './OutputPanel';
import { StudioPanel } from './StudioPanel';

type Tab = 'images' | 'copy' | 'output';

const TABS: Array<{ id: Tab; label: string; icon: typeof Images }> = [
  { id: 'images', label: 'Imágenes', icon: Images },
  { id: 'copy', label: 'Copy', icon: FileText },
  { id: 'output', label: 'Salida', icon: Send },
];

interface RightRailProps {
  gridName: string;
  day: number;
  themes: ThemeEntry[];
  assets: Asset[];
  pieces: ExportPiece[];
  brandText: string | null;
  messages: ChatMessage[];
  generating: boolean;
  onGenerate: (slideNumber: number, prompt: string) => Promise<boolean>;
  onCaptionChange: (day: number, value: string) => void;
  onImportCopys: (copys: Array<string | null>) => void;
  onSelectDay: (day: number) => void;
  onSchedule: () => void;
}

/** Columna derecha con pestañas: estudio de imágenes, copy con control de calidad y salida. */
export function RightRail(props: RightRailProps) {
  const { day, themes, assets } = props;
  const [tab, setTab] = useState<Tab>('images');

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next.id);
    document.getElementById(`gw-tab-${next.id}`)?.focus();
  }

  return (
    <section className="gw-rail card" aria-label="Imágenes, copy y salida" data-tour="gi-studio">
      <div className="gw-tabs" role="tablist" aria-label="Paneles del día" onKeyDown={onKeyDown}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`gw-tab-${id}`}
            type="button"
            role="tab"
            className="gw-tab"
            aria-selected={tab === id}
            aria-controls={`gw-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
          >
            <Icon size={14} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div id={`gw-panel-${tab}`} role="tabpanel" aria-labelledby={`gw-tab-${tab}`} className="gw-tabpanel">
        {tab === 'images' && (
          <StudioPanel
            gridName={props.gridName}
            day={day}
            dayTitle={themes[day]?.title?.trim() ?? ''}
            assets={assets.filter((a) => a.themeIndex === day)}
            generating={props.generating}
            onGenerate={props.onGenerate}
          />
        )}
        {tab === 'copy' && (
          <CopyPanel
            day={day}
            themes={themes}
            brandText={props.brandText}
            messages={props.messages}
            onCaptionChange={props.onCaptionChange}
            onImport={props.onImportCopys}
            onSelectDay={props.onSelectDay}
          />
        )}
        {tab === 'output' && (
          <OutputPanel gridName={props.gridName} pieces={props.pieces} onSchedule={props.onSchedule} />
        )}
      </div>
    </section>
  );
}
