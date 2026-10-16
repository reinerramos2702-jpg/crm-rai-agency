'use client';

import React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { templateTags, triggerKindLabel } from '@/lib/automation-templates';
import { TRIGGER_META } from '@/lib/automations/ui-meta';
import { NICHE_META, type TemplateT } from '../templates-data';
import '../templates.css';

const MAX_TAGS = 2;

interface TemplateCardProps {
  template: TemplateT;
  busy: boolean;
  disabled: boolean;
  onPreview: (template: TemplateT) => void;
  onUse: (template: TemplateT) => void;
}

export function TemplateCard({ template, busy, disabled, onPreview, onUse }: TemplateCardProps) {
  const niche = NICHE_META[template.niche];
  const Icon = niche.icon;
  const tags = templateTags(template);
  const extra = tags.length - MAX_TAGS;

  return (
    <article className="tp-card fx-reveal" aria-label={template.name}>
      <div className="tp-card-top">
        <span className="tp-icon" aria-hidden="true"><Icon size={18} /></span>
        <span className="tp-niche">{niche.label}</span>
        <span className="tp-steps">{template.steps.length} pasos</span>
      </div>
      <h3 className="tp-title">
        <button type="button" className="tp-open" onClick={() => onPreview(template)} aria-label={`Ver vista previa de ${template.name}`}>
          {template.name}
        </button>
      </h3>
      <p className="tp-desc">{template.description}</p>
      <div className="tp-tags">
        <span className="tp-tag tp-tag--kind" title={TRIGGER_META[template.trigger.type]?.label}>{triggerKindLabel(template)}</span>
        {tags.slice(0, MAX_TAGS).map((tag) => (
          <span key={tag} className="tp-tag">{tag}</span>
        ))}
        {extra > 0 && <span className="tp-tag">+{extra}</span>}
      </div>
      <div className="tp-actions fx-reveal-actions">
        <button type="button" className="au-btn au-btn--soft au-btn--sm" onClick={() => onUse(template)} disabled={disabled}>
          {busy ? <Loader2 size={14} className="au-spin" /> : <Plus size={14} />} {busy ? 'Creando…' : 'Usar plantilla'}
        </button>
      </div>
    </article>
  );
}
