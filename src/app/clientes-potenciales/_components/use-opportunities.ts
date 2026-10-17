'use client';

import { useCallback, useRef, useState } from 'react';
import { buildOpportunity, type Opportunity, type OpportunityForm, type OpportunityStatus } from './opportunity-model';
import type { StageId } from './stages';

/**
 * Oportunidades de la sesión. Todavía no existe un servicio `/api/opportunities`, así que viven solo en
 * memoria mientras la página está abierta (la interfaz lo avisa). Cuando exista el servicio, solo cambia este hook.
 */
export function useOpportunities() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const counter = useRef(0);

  const add = useCallback((form: OpportunityForm): Opportunity => {
    counter.current += 1;
    const created = buildOpportunity(form, `local-${Date.now()}-${counter.current}`, new Date());
    setItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const moveTo = useCallback((ids: readonly string[], stageId: StageId) => {
    const set = new Set(ids);
    setItems((prev) => prev.map((o) => (set.has(o.id) ? { ...o, stageId } : o)));
  }, []);

  const setStatus = useCallback((ids: readonly string[], status: OpportunityStatus) => {
    const set = new Set(ids);
    setItems((prev) => prev.map((o) => (set.has(o.id) ? { ...o, status } : o)));
  }, []);

  const remove = useCallback((ids: readonly string[]) => {
    const set = new Set(ids);
    setItems((prev) => prev.filter((o) => !set.has(o.id)));
  }, []);

  return { items, add, moveTo, setStatus, remove };
}
