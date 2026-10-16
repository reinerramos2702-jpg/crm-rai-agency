'use client';

import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { TopBar } from '@/components/layout/TopBar';
import { brandFromConfig, hasBrandData } from '@/lib/campaign-brand';
import { buildContextSuffix } from '@/lib/campaign-context';
import { PROVIDERS } from '@/lib/campaign-new-options';
import { ChatPanel } from './ChatPanel';
import { ConfigPanel } from './ConfigPanel';
import { DraftBanner } from './DraftBanner';
import { useAttachments } from './hooks/useAttachments';
import { useCampaignChat } from './hooks/useCampaignChat';
import { useCampaignForm } from './hooks/useCampaignForm';
import { useCampaignPresets } from './hooks/useCampaignPresets';
import { useCampaignSession, type NewCampaignParams } from './hooks/useCampaignSession';
import { useReadiness, usePlannerConfig } from './hooks/useReadiness';
import { useResearch } from './hooks/useResearch';
import './campaign-new.css';

export default function NewCampaignPage() {
  // Identidad de la campaña + formulario. El borrador solo se activa en campañas nuevas (tras leer la URL).
  const newParams = useRef<NewCampaignParams>({ name: '', pipelineType: 'ugc' });
  const session = useCampaignSession(newParams);
  const cf = useCampaignForm(session.isNew === true);
  const { form } = cf;
  useEffect(() => {
    newParams.current = { name: form.name, pipelineType: form.pipelineType };
  }, [form.name, form.pipelineType]);
  const presets = useCampaignPresets();
  const attachments = useAttachments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const planner = usePlannerConfig();

  const ensure = session.ensureCampaign;

  const research = useResearch({
    inventoryPath: form.inventoryPath,
    competitorUrls: form.competitorUrls,
    adsLibraryBrand: form.adsLibraryBrand,
    adsLibraryCountry: form.adsLibraryCountry,
    ensureCampaign: ensure,
  });

  const buildContext = useCallback(
    () =>
      buildContextSuffix({
        brandInput: form.brandInput,
        inventory: research.inventory,
        inventoryPath: form.inventoryPath,
        adsLibrary: research.adsLibraryResult,
        adsLibraryBrand: form.adsLibraryBrand,
        competitorInsights: research.competitorInsights,
        imageProvider: form.imageProvider,
        brief: cf.brief,
      }),
    [form, cf.brief, research.inventory, research.adsLibraryResult, research.competitorInsights],
  );

  const chat = useCampaignChat({
    campaignId: session.campaignId,
    ensureCampaign: ensure,
    provider: form.provider,
    modelId: form.modelId,
    imageProvider: form.imageProvider,
    pipelineType: form.pipelineType,
    buildContext,
    attachments,
    onFinalized: cf.clearDraft,
  });

  // Al reabrir una campaña existente se rellenan formulario, chat e investigación.
  const { loaded } = session;
  const { apply } = cf;
  const { setMessages } = chat;
  const { setCompetitorInsights } = research;
  useEffect(() => {
    if (!loaded) return;
    const prov = PROVIDERS.find((p) => p.provider === loaded.llmProvider);
    apply({
      name: loaded.name,
      ...(loaded.pipelineType ? { pipelineType: loaded.pipelineType } : {}),
      ...(loaded.llmProvider ? { provider: loaded.llmProvider } : {}),
      ...(loaded.llmModel ? { modelId: loaded.llmModel } : prov ? { modelId: prov.models[0] } : {}),
    });
    if (loaded.chatHistory.length > 0) setMessages(loaded.chatHistory);
    if (loaded.competitorInsights) setCompetitorInsights(loaded.competitorInsights);
  }, [loaded, apply, setMessages, setCompetitorInsights]);

  const readiness = useReadiness({
    name: form.name,
    brandInput: form.brandInput,
    provider: form.provider,
    imageProvider: form.imageProvider,
    pipelineType: form.pipelineType,
  });

  const plannerConfig = planner.data?.config;
  const canLoadBrand = plannerConfig !== undefined && hasBrandData(plannerConfig);

  const loadBrand = useCallback(() => {
    if (!plannerConfig || !hasBrandData(plannerConfig)) return;
    cf.setField('brandInput', brandFromConfig(plannerConfig));
    toast.success('Marca cargada desde Configuración');
  }, [plannerConfig, cf]);

  function onReadinessAction(action: 'focus-name' | 'load-brand') {
    if (action === 'load-brand') loadBrand();
    else document.getElementById('cn-name-input')?.focus();
  }

  // Progreso informativo: se completa solo según lo que ya hizo la persona.
  const cnSteps = [
    { n: 1, label: 'Configura tu campaña', done: form.name.trim().length > 0 },
    { n: 2, label: 'Conversa con la IA', done: chat.messages.length >= 2 },
    { n: 3, label: 'Genera el Plan Maestro', done: chat.finalizing },
  ];
  const cnCurrent = cnSteps.findIndex((st) => !st.done);

  return (
    <>
      <TopBar title="Nueva Campaña" subtitle="Planifica tu campaña de contenido con IA" />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files?.length) {
            attachments.addFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      <ol className="cn-steps" data-tour="cn-steps" aria-label="Progreso de la campaña">
        {cnSteps.map((st, i) => (
          <li
            key={st.n}
            className={`cn-step${st.done ? ' is-done' : ''}${i === cnCurrent ? ' is-current' : ''}`}
            aria-current={i === cnCurrent ? 'step' : undefined}
          >
            <span className="cn-step-dot" aria-hidden="true">
              {st.done ? (
                <svg viewBox="0 0 16 16" width="12" height="12" focusable="false">
                  <path d="M3 8.5l3.2 3.2L13 4.8" />
                </svg>
              ) : (
                st.n
              )}
            </span>
            <span className="cn-step-label">{st.label}</span>
          </li>
        ))}
      </ol>

      {cf.recovered && (
        <DraftBanner savedAt={cf.recovered.savedAt} onRestore={cf.restoreDraft} onDiscard={cf.discardRecovered} />
      )}

      <div className="cn-layout cn-v2">
        <ConfigPanel
          cf={cf}
          research={research}
          input={chat.input}
          setInput={chat.setInput}
          presets={presets.presets}
          onSavePreset={presets.save}
          onRemovePreset={presets.remove}
          canLoadBrand={canLoadBrand}
          onLoadBrand={loadBrand}
          serverCampaignId={loaded?.hasMaster ? session.campaignId : null}
        />
        <ChatPanel
          cf={cf}
          chat={chat}
          research={research}
          attachments={attachments}
          readiness={readiness}
          onReadinessAction={onReadinessAction}
          onAttachClick={() => fileInputRef.current?.click()}
        />
      </div>
    </>
  );
}
