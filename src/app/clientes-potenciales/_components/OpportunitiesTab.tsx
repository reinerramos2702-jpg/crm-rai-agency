'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Info, LayoutGrid, List } from 'lucide-react';
import { ConfirmDialog } from '../../contactos/_shared/ConfirmDialog';
import { CrmPopover } from '../../contactos/_shared/CrmPopover';
import { CrmTabs, panelDomId, tabDomId } from '../../contactos/_shared/CrmTabs';
import { FilterChips, type FilterChip } from '../../contactos/_shared/FilterChips';
import { datedFilename, downloadCsv } from '../../contactos/_shared/crm-download';
import { prune, setMany, toggleId } from '../../contactos/_shared/crm-selection';
import { plural } from '../../contactos/_shared/crm-text';
import { useDebouncedValue } from '../../contactos/_shared/use-debounced-value';
import { AddOpportunityHost } from './AddOpportunityHost';
import { CustomizeCardDrawer } from './CustomizeCardDrawer';
import { OpportunitiesBulk } from './OpportunitiesBulk';
import { PipelineBoard } from './PipelineBoard';
import { PipelineHead, type PipelineView } from './PipelineHead';
import { PipelineHero } from './PipelineHero';
import { PipelineList } from './PipelineList';
import { PipelineToolbar } from './PipelineToolbar';
import { PreviewEmpty } from '../../contactos/_shared/PreviewEmpty';
import {
  STATUS_LABELS, filterOpportunities, opportunitiesToCsv, sortOpportunities, totals,
  type OpportunityFilters, type OpportunityForm, type OpportunitySort, type OpportunityTemplate,
} from './opportunity-model';
import type { StageId } from './stages';
import type { CardPrefs } from './card-prefs';
import type { useOpportunities } from './use-opportunities';

type Store = ReturnType<typeof useOpportunities>;
type Dialog = { kind: 'none' } | { kind: 'add'; initial?: Partial<OpportunityForm> } | { kind: 'customize' } | { kind: 'delete' };

const VIEW_TABS = [{ id: 'activas', label: 'Oportunidades activas', icon: List }] as const;
const EMPTY: OpportunityFilters = { q: '', status: '' };

interface OpportunitiesTabProps {
  store: Store;
  prefs: CardPrefs;
  onPrefs: (next: CardPrefs) => void;
}

function GhostRow() {
  return <div className="crm-ghost-row"><i className="crm-ghost-dot" /><i /><i /><i /><i /></div>;
}

/** Pestaña principal: tablero o lista del embudo con búsqueda, filtros, orden y selección múltiple. */
export function OpportunitiesTab({ store, prefs, onPrefs }: OpportunitiesTabProps) {
  const { items } = store;
  const [view, setView] = useState<PipelineView>('board');
  const [filters, setFilters] = useState<OpportunityFilters>(EMPTY);
  const [sort, setSort] = useState<OpportunitySort>('recent');
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });

  const q = useDebouncedValue(filters.q, 150);
  const visible = useMemo(
    () => sortOpportunities(filterOpportunities(items, { ...filters, q }), sort),
    [items, filters, q, sort],
  );
  const selected = useMemo(() => prune(picked, items.map((o) => o.id)), [picked, items]);
  const openTotals = useMemo(() => totals(items.filter((o) => o.status === 'open')), [items]);
  const close = () => setDialog({ kind: 'none' });
  const ids = Array.from(selected);
  const isEmpty = items.length === 0;

  const chips: FilterChip[] = [];
  if (filters.q.trim()) chips.push({ key: 'q', label: `Búsqueda: ${filters.q.trim()}`, onRemove: () => setFilters({ ...filters, q: '' }) });
  if (filters.status) chips.push({ key: 'status', label: `Estado: ${STATUS_LABELS[filters.status]}`, onRemove: () => setFilters({ ...filters, status: '' }) });

  function addAt(stageId: StageId) { setDialog({ kind: 'add', initial: { stageId } }); }
  function fromTemplate(t: OpportunityTemplate) { setDialog({ kind: 'add', initial: t.form }); }

  return (
    <>
      <PipelineHead count={items.length} value={openTotals.value} view={view} onView={setView} onAdd={() => setDialog({ kind: 'add' })} />
      <CrmTabs
        tabs={VIEW_TABS}
        value="activas"
        onChange={() => undefined}
        idPrefix="pl-views"
        ariaLabel="Vistas del embudo"
        trailing={
          <CrmPopover label="Lista" icon={<List size={14} aria-hidden="true" />}>
            {(closeMenu) => (
              <div className="crm-menu" role="radiogroup" aria-label="Tipo de vista">
                <button type="button" role="radio" aria-checked={view === 'board'} className="crm-menu-item" onClick={() => { setView('board'); closeMenu(); }}>
                  <LayoutGrid size={14} aria-hidden="true" /> Vista de tablero
                </button>
                <button type="button" role="radio" aria-checked={view === 'list'} className="crm-menu-item" onClick={() => { setView('list'); closeMenu(); }}>
                  <List size={14} aria-hidden="true" /> Vista de lista
                </button>
              </div>
            )}
          </CrmPopover>
        }
      />
      <div role="tabpanel" id={panelDomId('pl-views', 'activas')} aria-labelledby={tabDomId('pl-views', 'activas')} className="crm-panel">
        {isEmpty && <PipelineHero onAdd={() => setDialog({ kind: 'add' })} onTemplate={fromTemplate} />}
        {!isEmpty && (
          <p className="pl-note" role="note">
            <Info size={14} aria-hidden="true" /> Las oportunidades se guardan solo en esta sesión: el servicio de oportunidades está en desarrollo.
          </p>
        )}
        <PipelineToolbar filters={filters} onFilters={setFilters} sort={sort} onSort={setSort} onManageFields={() => setDialog({ kind: 'customize' })} />
        <FilterChips chips={chips} onClear={() => setFilters(EMPTY)} />
        <OpportunitiesBulk
          count={selected.size}
          onClear={() => setPicked(new Set())}
          onMove={(stage) => { store.moveTo(ids, stage); toast.success(`${plural(ids.length, 'oportunidad movida', 'oportunidades movidas')}`); }}
          onStatus={(status) => { store.setStatus(ids, status); toast.success(`Marcadas como «${STATUS_LABELS[status]}»`); }}
          onExport={() => downloadCsv(datedFilename('oportunidades'), opportunitiesToCsv(items.filter((o) => selected.has(o.id))))}
          onDelete={() => setDialog({ kind: 'delete' })}
        />
        {view === 'board' ? (
          <PipelineBoard
            items={visible}
            prefs={prefs}
            selected={selected}
            showGhosts={isEmpty}
            onToggle={(id) => setPicked(toggleId(selected, id))}
            onMove={(id, stage) => store.moveTo([id], stage)}
            onAdd={addAt}
          />
        ) : isEmpty ? (
          <div className="crm-card">
            <PreviewEmpty
              bare
              title="Aún no tienes oportunidades"
              text="Crea una oportunidad o cambia a la vista de tablero para ver el embudo completo."
              ghosts={<><GhostRow /><GhostRow /><GhostRow /></>}
              actions={null}
            />
          </div>
        ) : (
          <PipelineList
            rows={visible}
            selected={selected}
            onToggle={(id) => setPicked(toggleId(selected, id))}
            onToggleAll={(checked) => setPicked(setMany(selected, visible.map((o) => o.id), checked))}
            onResetFilters={() => setFilters(EMPTY)}
          />
        )}
      </div>

      {dialog.kind === 'add' && <AddOpportunityHost initial={dialog.initial} onClose={close} onCreate={store.add} />}
      {dialog.kind === 'customize' && <CustomizeCardDrawer prefs={prefs} onSave={onPrefs} onClose={close} />}
      {dialog.kind === 'delete' && (
        <ConfirmDialog
          title={`Eliminar ${plural(ids.length, 'oportunidad', 'oportunidades')}`}
          text="Se quitarán del embudo. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={() => { store.remove(ids); setPicked(new Set()); toast.success('Oportunidades eliminadas'); close(); }}
          onClose={close}
        />
      )}
    </>
  );
}
