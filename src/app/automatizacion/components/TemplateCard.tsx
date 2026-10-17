'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { templateTags, triggerKindLabel } from '@/lib/automation-templates';
import { CATEGORY_LABELS, categoryOf, readinessOf, type Requirement } from '@/lib/automation-template-gallery';
import { TRIGGER_META } from '@/lib/automations/ui-meta';
import { CATEGORY_ICONS, NICHE_META, type TemplateT } from '../templates-data';
import '../templates.css';

const MAX_TAGS = 2;

interface TemplateCardProps {
  template: TemplateT;
  requirements: Requirement[];
  onOpen: (template: TemplateT) => void;
}

export function TemplateCard({ template, requirements, onOpen }: TemplateCardProps) {
  const category = categoryOf(template);
  const Icon = CATEGORY_ICONS[category];
  const tags = templateTags(template);
  const extra = tags.length - MAX_TAGS;
  const ready = readinessOf(requirements);

  return (
    <article className="tp-card fx-reveal" aria-label={template.name}>
      <div className="tp-card-top">
        <span className="tp-icon" aria-hidden="true"><Icon size={18} /></span>
        <span className="tp-niche">{CATEGORY_LABELS[category]} · {NICHE_META[template.niche].chip}</span>
        <span className="tp-steps">{template.steps.length} {template.steps.length === 1 ? 'paso' : 'pasos'}</span>
      </div>
      <h3 className="tp-title">
        <button type="button" className="tp-open" onClick={() => onOpen(template)} aria-label={`Ver y usar la plantilla ${template.name}`}>
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
      <div className="tp-foot">
        <span className={`tp-ready tp-ready--${ready.tone}`}>
          <span className={`fx-dot ${ready.tone === 'ok' ? 'fx-dot--ok' : ready.tone === 'warn' ? 'fx-dot--warn' : ''}`} aria-hidden="true" />
          {ready.label}
        </span>
        <span className="tp-actions fx-reveal-actions">
          <button type="button" className="au-btn au-btn--soft au-btn--sm" onClick={() => onOpen(template)}>
            Usar plantilla <ArrowRight size={13} />
          </button>
        </span>
      </div>
    </article>
  );
}
