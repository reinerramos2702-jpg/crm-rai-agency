'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import { IMAGE_PROVIDERS } from '@/lib/campaign-new-options';
import type { CampaignPreset } from '@/lib/campaign-presets';
import { LiveCost } from './LiveCost';
import { ModelPicker } from './ModelPicker';
import { PipelineCards } from './PipelineCards';
import { ResearchSection } from './ResearchSection';
import { StartPanel } from './StartPanel';
import type { CampaignForm } from './hooks/useCampaignForm';
import type { Research } from './hooks/useResearch';

/** Variables CSS en línea (p. ej. el retardo escalonado `--i`). */
const cv = (vars: Record<string, string | number>) => vars as CSSProperties;

interface ConfigPanelProps {
  cf: CampaignForm;
  research: Research;
  input: string;
  setInput: (text: string) => void;
  presets: CampaignPreset[];
  onSavePreset: (preset: CampaignPreset) => void;
  onRemovePreset: (id: string) => void;
  canLoadBrand: boolean;
  onLoadBrand: () => void;
  serverCampaignId: string | null;
}

/** Panel izquierdo: arranque rápido, datos básicos, modelos, material opcional y costo en vivo. */
export function ConfigPanel(props: ConfigPanelProps) {
  const { cf, research, input, setInput } = props;
  const { form, savedAt } = cf;

  // Campos opcionales: aparecen al nombrar la campaña y se quedan (no desaparecen si se borra el nombre).
  const [optionalOpen, setOptionalOpen] = useState(false);
  useEffect(() => {
    if (form.name.trim()) setOptionalOpen(true);
  }, [form.name]);

  return (
    <div className="cn-side">
      <StartPanel
        cf={cf}
        input={input}
        setInput={setInput}
        presets={props.presets}
        onSavePreset={props.onSavePreset}
        onRemovePreset={props.onRemovePreset}
      />

      <div className="cn-sec" data-tour="cn-name" style={cv({ '--i': 1 })}>
        <div className="cn-label-row">
          <label className="label" htmlFor="cn-name-input">Nombre de la campaña</label>
          <span className="cn-draft-status" role="status">
            {savedAt !== null && (
              <>
                <span className="fx-dot fx-dot--ok" aria-hidden="true" />
                Borrador guardado
              </>
            )}
          </span>
        </div>
        <input
          id="cn-name-input"
          value={form.name}
          onChange={(e) => cf.setField('name', e.target.value)}
          placeholder="Ej: Sprint 30 días Mayo"
          style={{ width: '100%' }}
        />
      </div>

      <div className="cn-sec" data-tour="cn-pipeline" style={cv({ '--i': 2 })}>
        <p id="cn-pipeline-label" className="label" style={{ marginBottom: 6 }}>Tipo de Pipeline</p>
        <PipelineCards value={form.pipelineType} onChange={(v) => cf.setField('pipelineType', v)} labelledBy="cn-pipeline-label" />
      </div>

      <div className="cn-sec" data-tour="cn-model" style={cv({ '--i': 3 })}>
        <p className="label" style={{ marginBottom: 6 }}>Modelo de Planificación</p>
        <ModelPicker
          provider={form.provider}
          modelId={form.modelId}
          onProviderChange={cf.changeProvider}
          onModelChange={(m) => cf.setField('modelId', m)}
        />
      </div>

      <div className="cn-sec" data-tour="cn-image" style={cv({ '--i': 4 })}>
        <label className="label" htmlFor="cn-image-select" style={{ display: 'block', marginBottom: 6 }}>
          Generación de Imágenes
        </label>
        <select
          id="cn-image-select"
          value={form.imageProvider}
          onChange={(e) => cf.setField('imageProvider', e.target.value)}
          style={{ width: '100%' }}
        >
          {IMAGE_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <Link href="/automatizacion" className="card cn-sec cn-tip" data-tour="cn-tip" style={cv({ '--i': 5 })}>
        <Zap size={14} color="var(--rai-gold)" aria-hidden="true" />
        <span className="cn-tip-text">Tip: automatiza el seguimiento de los nuevos contactos que lleguen por esta campaña.</span>
        <ArrowRight size={12} color="var(--rai-gold)" style={{ flexShrink: 0 }} aria-hidden="true" />
      </Link>

      {optionalOpen ? (
        <ResearchSection cf={cf} r={research} canLoadBrand={props.canLoadBrand} onLoadBrand={props.onLoadBrand} />
      ) : (
        <p className="cn-more-hint" data-tour="cn-more">
          Al escribir el nombre de la campaña aparecerán los campos opcionales: carpeta de planificación, manual de marca y competencia.
        </p>
      )}

      <div className="cn-cost-dock">
        <LiveCost
          pipelineType={form.pipelineType}
          modelId={form.modelId}
          imageProvider={form.imageProvider}
          serverCampaignId={props.serverCampaignId}
        />
      </div>
    </div>
  );
}
