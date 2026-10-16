'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, Search, SearchX, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  TEMPLATE_SORT_LABELS,
  countByNiche,
  filterTemplates,
  sortTemplates,
  type NicheFilter,
  type TemplateSort,
} from '@/lib/automation-templates';
import { applyNameTemplate } from '@/lib/automation-prefs';
import { EmptyState } from '@/components/ui/EmptyState';
import { errorMessage } from '../api';
import { NICHE_FILTERS, TEMPLATES, type TemplateT } from '../templates-data';
import { TemplateCard } from '../components/TemplateCard';
import { TemplatePreview } from '../components/TemplatePreview';
import { useAutomationPrefs } from '../use-automation-prefs';
import type { NewWorkflowInput } from '../use-automations';
import '../templates.css';

interface TemplatesTabProps {
  createWorkflow: (input: NewWorkflowInput) => Promise<{ id: string }>;
}

export default function TemplatesTab({ createWorkflow }: TemplatesTabProps) {
  const router = useRouter();
  const { prefs } = useAutomationPrefs();
  const [query, setQuery] = useState('');
  const [niche, setNiche] = useState<NicheFilter>('todas');
  const [sort, setSort] = useState<TemplateSort>('recomendado');
  const [preview, setPreview] = useState<TemplateT | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const counts = useMemo(() => countByNiche(TEMPLATES, query), [query]);
  const visible = useMemo(() => sortTemplates(filterTemplates(TEMPLATES, query, niche), sort), [query, niche, sort]);
  const filtering = query.trim() !== '' || niche !== 'todas';

  const clearFilters = () => {
    setQuery('');
    setNiche('todas');
  };

  async function createFromTemplate(template: TemplateT) {
    if (creatingId) return;
    setCreatingId(template.id);
    try {
      const workflow = await createWorkflow({ templateId: template.id, name: applyNameTemplate(prefs.nameTemplate, template.name) });
      toast.success('Flujo creado como borrador. Revísalo y actívalo cuando esté listo.');
      router.push(`/automatizacion/${workflow.id}`);
    } catch (e: unknown) {
      toast.error(errorMessage(e));
      setCreatingId(null);
    }
  }

  return (
    <section aria-label="Plantillas de automatización">
      <div className="tp-toolbar" data-tour="tpl-filters">
        <div className="tp-toolbar-row">
          <div className="au-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca por nombre, disparador o acción…"
              aria-label="Buscar plantillas"
            />
            {query && (
              <button type="button" className="au-search-clear" onClick={() => setQuery('')} aria-label="Borrar búsqueda">
                <X size={15} />
              </button>
            )}
          </div>
          <label className="au-field">
            <span>Ordenar</span>
            <select className="au-select" value={sort} onChange={(e) => setSort(e.target.value as TemplateSort)}>
              {(Object.keys(TEMPLATE_SORT_LABELS) as TemplateSort[]).map((key) => (
                <option key={key} value={key}>{TEMPLATE_SORT_LABELS[key]}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="au-chips" role="group" aria-label="Filtrar por categoría">
          {NICHE_FILTERS.map((f) => (
            <button key={f.id} type="button" className="au-chip" aria-pressed={niche === f.id} onClick={() => setNiche(f.id)}>
              {f.label} <span className="au-chip-n">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <p className="tp-count" role="status" aria-live="polite">
          {visible.length === 1 ? '1 plantilla' : `${visible.length} plantillas`}
          {filtering ? ' con los filtros actuales' : ' listas para usar'}
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={filtering ? SearchX : LayoutTemplate}
          title="Ninguna plantilla coincide"
          text="Prueba con otra palabra (por ejemplo «cita», «pedido» o «etiqueta») o cambia de categoría."
          action={
            <button type="button" className="au-btn au-btn--soft" onClick={clearFilters}>
              Limpiar filtros
            </button>
          }
        />
      ) : (
        <div className="tp-grid" data-tour="tpl-grid">
          {visible.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              busy={creatingId === template.id}
              disabled={creatingId !== null}
              onPreview={setPreview}
              onUse={createFromTemplate}
            />
          ))}
        </div>
      )}

      {preview && (
        <TemplatePreview
          template={preview}
          busy={creatingId === preview.id}
          onClose={() => setPreview(null)}
          onUse={createFromTemplate}
        />
      )}
    </section>
  );
}
