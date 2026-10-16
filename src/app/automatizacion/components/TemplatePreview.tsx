'use client';

import React from 'react';
import { Clock, GitBranch, Loader2, Plus, Send, Zap, type LucideIcon } from 'lucide-react';
import { buildFlowPreview, templateTags, triggerKindLabel, type PreviewKind } from '@/lib/automation-templates';
import { NICHE_META, type TemplateT } from '../templates-data';
import { Dialog } from './Dialog';
import '../templates.css';

const KIND_META: Record<PreviewKind, { label: string; icon: LucideIcon }> = {
  trigger: { label: 'Disparador', icon: Zap },
  condition: { label: 'Condición', icon: GitBranch },
  delay: { label: 'Espera', icon: Clock },
  action: { label: 'Acción', icon: Send },
};

interface TemplatePreviewProps {
  template: TemplateT;
  busy: boolean;
  onClose: () => void;
  onUse: (template: TemplateT) => void;
}

export function TemplatePreview({ template, busy, onClose, onUse }: TemplatePreviewProps) {
  const niche = NICHE_META[template.niche];
  const Icon = niche.icon;
  const steps = buildFlowPreview(template);

  return (
    <Dialog
      title={template.name}
      titleId="tp-preview-title"
      onClose={onClose}
      icon={<span className="tp-icon" aria-hidden="true"><Icon size={18} /></span>}
      footer={(close) => (
        <>
          <button type="button" className="au-btn au-btn--ghost" onClick={close}>Cerrar</button>
          <button type="button" className="au-btn au-btn--primary" data-autofocus onClick={() => onUse(template)} disabled={busy}>
            {busy ? <Loader2 size={14} className="au-spin" /> : <Plus size={14} />} {busy ? 'Creando…' : 'Usar plantilla'}
          </button>
        </>
      )}
    >
      <p className="tp-preview-lead">{template.description}</p>
      <div className="tp-preview-meta">
        <span className="tp-tag tp-tag--kind">{triggerKindLabel(template)}</span>
        <span className="tp-tag">{niche.label}</span>
        {templateTags(template).map((tag) => (
          <span key={tag} className="tp-tag">{tag}</span>
        ))}
      </div>
      <h3 className="tp-timeline-title">Cómo funciona</h3>
      <ol className="tp-timeline">
        {steps.map((step, i) => {
          const meta = KIND_META[step.kind];
          const StepIcon = meta.icon;
          return (
            <li key={i} className={`tp-step tp-step--${step.kind}`} style={{ '--i': i } as React.CSSProperties}>
              <span className="tp-node" aria-hidden="true"><StepIcon size={15} /></span>
              <div>
                <span className="tp-step-kind">{meta.label}</span>
                <p className="tp-step-title">{step.title}</p>
                {step.detail && <p className="tp-step-detail">{step.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="tp-preview-note">Se crea como borrador: podrás ajustar todo en el editor antes de activarlo.</p>
    </Dialog>
  );
}
