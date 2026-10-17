'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, Search, SearchX, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { TEMPLATE_SORT_LABELS, sortTemplates, type TemplateSort } from '@/lib/automation-templates';
import {
  DEFAULT_GALLERY_FILTERS,
  countByCategory,
  filterGallery,
  templateRequirements,
  type GalleryFilters,
} from '@/lib/automation-template-gallery';
import { applyNameTemplate } from '@/lib/automation-prefs';
import { EmptyState } from '@/components/ui/EmptyState';
import { errorMessage } from '../api';
import { pickOption } from '../guards';
import { CATEGORY_FILTERS, NICHE_FILTERS, TEMPLATES, type TemplateT } from '../templates-data';
import { TemplateCard } from '../components/TemplateCard';
import { TemplatePreview } from '../components/TemplatePreview';
import { useAutomationPrefs } from '../use-automation-prefs';
import type { NewWorkflowInput } from '../use-automations';
import '../templates.css';

const SORT_KEYS: readonly TemplateSort[] = ['recomendado', 'nombre', 'pasos-asc', 'pasos-desc'];

interface TemplatesTabProps {
  createWorkflow: (input: NewWorkflowInput) => Promise<{ id: string }>;
  /** `null` mientras se cargan los ajustes. */
  webhookConfigured: boolean | null;
}

export default function TemplatesTab({ createWorkflow, webhookConfigured }: TemplatesTabProps) {
  const router = useRouter();
  const { prefs } = useAutomationPrefs();
  const [filters, setFilters] = useState<GalleryFilters>(DEFAULT_GALLERY_FILTERS);
  const [sort, setSort] = useState<TemplateSort>('recomendado');
  const [open, setOpen] = useState<TemplateT | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const counts = useMemo(() => countByCategory(TEMPLATES, filters), [filters]);
  const visible = useMemo(() => sortTemplates(filterGallery(TEMPLATES, filters), sort), [filters, sort]);
  const requirementsById = useMemo(
    () => new Map(TEMPLATES.map((t) => [t.id, templateRequirements(t, { webhookConfigured })])),
    [webhookConfigured]
  );
  const filtering = filters.query.trim() !== '' || filters.category !== 'todas' || filters.niche !== 'todas';
  const set = (patch: Partial<GalleryFilters>) => setFilters((f) => ({ ...f, ...patch }));

  async function createFromTemplate(template: TemplateT) {
    if (creatingId) return;
    setCreatingId(template.id);
    try {
      const workflow = await createWorkflow({
        name: applyNameTemplate(prefs.nameTemplate, template.name),
        description: template.description,
        trigger: template.trigger,
        steps: template.steps,
      });
      toast.success('Flujo creado como borrador (inactivo). Revísalo y actívalo cuando esté listo.');
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
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
              placeholder="Busca: cita, reseña, pedido, etiqueta…"
              aria-label="Buscar plantillas"
            />
            {filters.query && (
              <button type="button" className="au-search-clear" onClick={() => set({ query: '' })} aria-label="Borrar búsqueda">
                <X size={15} />
              </button>
            )}
          </div>
          <label className="au-field">
            <span>Negocio</span>
            <select className="au-select" value={filters.niche} onChange={(e) => {
                const niche = pickOption(NICHE_FILTERS.map((n) => n.id), e.target.value);
                if (niche) set({ niche });
              }}>
              {NICHE_FILTERS.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </label>
          <label className="au-field">
            <span>Ordenar</span>
            <select className="au-select" value={sort} onChange={(e) => {
                const next = pickOption(SORT_KEYS, e.target.value);
                if (next) setSort(next);
              }}>
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>{TEMPLATE_SORT_LABELS[key]}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="au-chips" role="group" aria-label="Filtrar por objetivo">
          {CATEGORY_FILTERS.filter((c) => c.id === 'todas' || counts[c.id] > 0 || filters.category === c.id).map((c) => (
            <button key={c.id} type="button" className="au-chip" aria-pressed={filters.category === c.id} onClick={() => set({ category: c.id })}>
              {c.label} <span className="au-chip-n">{counts[c.id]}</span>
            </button>
          ))}
        </div>
        <p className="tp-count" role="status" aria-live="polite">
          {visible.length === 1 ? '1 plantilla' : `${visible.length} plantillas`}
          {filtering ? ' con los filtros actuales' : ' listas para usar'}. Todas se crean inactivas.
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={filtering ? SearchX : LayoutTemplate}
          title="Ninguna plantilla coincide"
          text="Prueba con otra palabra (por ejemplo «cita», «pedido» o «etiqueta») o cambia de objetivo."
          action={
            <button type="button" className="au-btn au-btn--soft" onClick={() => setFilters(DEFAULT_GALLERY_FILTERS)}>
              Limpiar filtros
            </button>
          }
        />
      ) : (
        <div className="tp-grid" data-tour="tpl-grid">
          {visible.map((template) => (
            <TemplateCard key={template.id} template={template} requirements={requirementsById.get(template.id) ?? []} onOpen={setOpen} />
          ))}
        </div>
      )}

      {open && (
        <TemplatePreview
          template={open}
          requirements={requirementsById.get(open.id) ?? []}
          busy={creatingId === open.id}
          onClose={() => setOpen(null)}
          onUse={createFromTemplate}
        />
      )}
    </section>
  );
}
