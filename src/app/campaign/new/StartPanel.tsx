'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  BedDouble,
  Building2,
  Check,
  GraduationCap,
  Home,
  Layers,
  Megaphone,
  ShoppingBag,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { useCachedJson } from '@/lib/use-cached-json';
import { PIPELINE_TYPES } from '@/lib/campaign-new-options';
import { CAMPAIGN_TEMPLATES, applyTemplate, type CampaignTemplate } from '@/lib/campaign-templates';
import { makePreset, type CampaignPreset } from '@/lib/campaign-presets';
import { reusePatch, toPastCampaigns, type PastCampaign } from '@/lib/campaign-reuse';
import { INITIAL_CAMPAIGN_DRAFT } from '@/lib/campaign-draft';
import { EMPTY_BRIEF } from '@/lib/campaign-brief';
import type { CampaignForm } from './hooks/useCampaignForm';

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  restaurante: UtensilsCrossed,
  hotel: BedDouble,
  tienda: ShoppingBag,
  servicios: Building2,
  belleza: Sparkles,
  inmobiliaria: Home,
  agencia: Megaphone,
  educacion: GraduationCap,
};

type Tab = 'templates' | 'reuse' | 'presets';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'templates', label: 'Plantillas' },
  { id: 'reuse', label: 'Campañas previas' },
  { id: 'presets', label: 'Mis preajustes' },
];

const pipelineName = (v: string) => PIPELINE_TYPES.find((p) => p.value === v)?.name ?? v;

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

interface StartPanelProps {
  cf: CampaignForm;
  input: string;
  setInput: (text: string) => void;
  presets: CampaignPreset[];
  onSavePreset: (preset: CampaignPreset) => void;
  onRemovePreset: (id: string) => void;
}

/** Atajos para no empezar en blanco: plantillas por negocio, reutilizar una campaña o un preajuste propio. */
export function StartPanel({ cf, input, setInput, presets, onSavePreset, onRemovePreset }: StartPanelProps) {
  const [tab, setTab] = useState<Tab | null>('templates');
  const { form, brief } = cf;

  function chooseTemplate(t: CampaignTemplate) {
    const out = applyTemplate(t, { name: form.name, brief });
    cf.apply({ name: out.name, pipelineType: out.pipelineType, brief: out.brief });
    if (!input.trim()) setInput(out.firstMessage);
    toast.success(`Plantilla «${t.label}» aplicada`);
    setTab(null);
  }

  function reuse(c: PastCampaign) {
    const p = reusePatch(c, { provider: INITIAL_CAMPAIGN_DRAFT.provider, modelId: INITIAL_CAMPAIGN_DRAFT.modelId });
    cf.apply(p);
    toast.success('Configuración reutilizada. Revisa el nombre.');
    setTab(null);
  }

  function applyPreset(p: CampaignPreset) {
    cf.apply({
      pipelineType: p.pipelineType,
      provider: p.provider,
      modelId: p.modelId,
      imageProvider: p.imageProvider,
      brandInput: p.brandInput,
      brief: p.brief,
    });
    toast.success(`Preajuste «${p.name}» aplicado`);
    setTab(null);
  }

  return (
    <div className="cn-sec cn-start" data-tour="cn-start">
      <p className="label" style={{ marginBottom: 6 }}>
        <Layers size={11} style={{ marginRight: 4, display: 'inline' }} aria-hidden="true" />
        Arranque rápido
      </p>
      <div className="cn-tabs" role="group" aria-label="Atajos para empezar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="cn-tab"
            aria-expanded={tab === t.id}
            onClick={() => setTab(tab === t.id ? null : t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        <div className="cn-start-body fx-field-in">
          <div className="cn-tpl-grid">
            {CAMPAIGN_TEMPLATES.map((t) => {
              const Icon = TEMPLATE_ICONS[t.id] ?? Sparkles;
              return (
                <button key={t.id} type="button" className="cn-tpl" onClick={() => chooseTemplate(t)}>
                  <span className="cn-tpl-icon" aria-hidden="true">
                    <Icon size={15} />
                  </span>
                  <span className="cn-tpl-text">
                    <span className="cn-tpl-name">{t.label}</span>
                    <span className="cn-tpl-desc">{t.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="cn-hint">Precarga el nombre (si está vacío), el pipeline, el brief y un primer mensaje. Puedes editar todo.</p>
        </div>
      )}

      {tab === 'reuse' && <ReusePicker onReuse={reuse} />}

      {tab === 'presets' && (
        <div className="cn-start-body fx-field-in">
          {presets.length === 0 ? (
            <p className="cn-hint">Aún no guardaste preajustes. Guarda la configuración actual para reutilizarla en un clic.</p>
          ) : (
            <ul className="cn-list">
              {presets.map((p) => (
                <li key={p.id} className="cn-list-row">
                  <button type="button" className="cn-list-main" onClick={() => applyPreset(p)}>
                    <span className="cn-list-name">{p.name}</span>
                    <span className="cn-list-meta">
                      {pipelineName(p.pipelineType)} · {p.modelId}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="cn-icon-btn"
                    aria-label={`Eliminar preajuste ${p.name}`}
                    onClick={() => onRemovePreset(p.id)}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <SavePreset
            defaultName={form.name}
            onSave={(name) => {
              onSavePreset(
                makePreset(name, {
                  pipelineType: form.pipelineType,
                  provider: form.provider,
                  modelId: form.modelId,
                  imageProvider: form.imageProvider,
                  brandInput: form.brandInput,
                  brief: form.brief ?? EMPTY_BRIEF,
                }),
              );
              toast.success(`Preajuste «${name.trim()}» guardado`);
            }}
          />
        </div>
      )}
    </div>
  );
}

function SavePreset({ defaultName, onSave }: { defaultName: string; onSave: (name: string) => void }) {
  const [name, setName] = useState<string | null>(null);
  const value = name ?? defaultName;
  return (
    <form
      className="cn-save"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onSave(value);
        setName(null);
      }}
    >
      <input
        value={value}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="Nombre del preajuste"
        aria-label="Nombre del preajuste"
      />
      <button type="submit" className="cn-mini-btn" disabled={!value.trim()}>
        <Check size={12} aria-hidden="true" /> Guardar actual
      </button>
    </form>
  );
}

/** Se monta solo al abrir la pestaña: la lista de campañas no se pide hasta que hace falta. */
function ReusePicker({ onReuse }: { onReuse: (c: PastCampaign) => void }) {
  const { data, error, loading } = useCachedJson<unknown>('/api/campaigns', { ttlMs: 30_000 });
  const list = data === undefined ? [] : toPastCampaigns(data).slice(0, 6);

  return (
    <div className="cn-start-body fx-field-in">
      {loading && (
        <div className="cn-skel" aria-busy="true">
          <span className="fx-sr-only" role="status">Cargando campañas…</span>
          <SkeletonLine height={34} />
          <SkeletonLine height={34} />
        </div>
      )}
      {!loading && error && data === undefined && <p className="cn-hint">No se pudieron cargar tus campañas. Inténtalo de nuevo más tarde.</p>}
      {data !== undefined && list.length === 0 && <p className="cn-hint">Todavía no tienes campañas anteriores.</p>}
      {list.length > 0 && (
        <ul className="cn-list">
          {list.map((c) => (
            <li key={c.id} className="cn-list-row">
              <span className="cn-list-main">
                <span className="cn-list-name">{c.name}</span>
                <span className="cn-list-meta">
                  {pipelineName(c.pipelineType)}
                  {c.modelId ? ` · ${c.modelId}` : ''}
                  {shortDate(c.updatedAt) ? ` · ${shortDate(c.updatedAt)}` : ''}
                </span>
              </span>
              <button type="button" className="cn-mini-btn" onClick={() => onReuse(c)}>
                Reusar
              </button>
              <a className="cn-mini-link" href={`/campaign/new?id=${encodeURIComponent(c.id)}`}>
                Continuar
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="cn-hint">«Reusar» copia pipeline y modelo con nombre nuevo; «Continuar» reabre esa campaña.</p>
    </div>
  );
}
