'use client';

import { BRIEF_FIELDS, MAX_BRIEF_FIELD, briefFilledCount, type BriefKey } from '@/lib/campaign-brief';
import { COST_TIER_LABELS, PIPELINE_TYPES, modelInfo, providerLabel } from '@/lib/campaign-new-options';
import type { CampaignForm } from './hooks/useCampaignForm';
import type { Research } from './hooks/useResearch';

interface PlanSummaryProps {
  cf: CampaignForm;
  research: Research;
  attachmentCount: number;
  messageCount: number;
}

/** Resumen vivo del plan: lo configurado + brief editable que viaja a la IA en cada mensaje. */
export function PlanSummary({ cf, research, attachmentCount, messageCount }: PlanSummaryProps) {
  const { form, brief } = cf;
  const pipeline = PIPELINE_TYPES.find((p) => p.value === form.pipelineType)?.name ?? form.pipelineType;
  const daysWithAssets = research.inventory.filter((d) => d.hasContent).length;
  const filled = briefFilledCount(brief);

  const facts: Array<[string, string]> = [
    ['Pipeline', pipeline],
    ['Modelo', `${providerLabel(form.provider)} · ${form.modelId} (costo ${COST_TIER_LABELS[modelInfo(form.modelId).cost].toLowerCase()})`],
    ['Marca', form.brandInput.trim() ? `${form.brandInput.trim().length.toLocaleString('es')} caracteres` : 'Sin manual'],
    [
      'Material',
      research.inventory.length > 0
        ? `${daysWithAssets} de ${research.inventory.length} días con assets`
        : attachmentCount > 0
          ? `${attachmentCount} adjunto(s) por enviar`
          : 'Sin material',
    ],
    [
      'Investigación',
      research.competitorInsights
        ? 'Competencia analizada'
        : research.adsLibraryResult
          ? `${research.adsLibraryResult.adsFound} anuncios revisados`
          : 'Sin investigar',
    ],
    ['Conversación', messageCount > 0 ? `${messageCount} mensajes` : 'Sin iniciar'],
  ];

  return (
    <div className="cn-summary" data-tour="cn-summary">
      <dl className="cn-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="cn-brief">
        <div className="cn-brief-head">
          <p className="label">Brief de la campaña</p>
          <span className="cn-hint">{filled} de {BRIEF_FIELDS.length} campos</span>
        </div>
        <div className="cn-brief-grid">
          {BRIEF_FIELDS.map((f) => {
            const id = `cn-brief-${f.key}`;
            const value = brief[f.key as BriefKey];
            return (
              <div key={f.key} className={f.multiline ? 'cn-brief-field is-wide' : 'cn-brief-field'}>
                <label htmlFor={id}>{f.label}</label>
                {f.multiline ? (
                  <textarea
                    id={id}
                    value={value}
                    rows={3}
                    maxLength={MAX_BRIEF_FIELD}
                    placeholder={f.placeholder}
                    onChange={(e) => cf.setBriefField(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    id={id}
                    value={value}
                    maxLength={MAX_BRIEF_FIELD}
                    placeholder={f.placeholder}
                    onChange={(e) => cf.setBriefField(f.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="cn-hint">Lo que escribas aquí se envía a la IA como contexto y se guarda en tu borrador.</p>
      </div>
    </div>
  );
}
