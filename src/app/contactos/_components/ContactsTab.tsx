'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Layers, Plus, RotateCw, TriangleAlert } from 'lucide-react';
import { CrmTabs, panelDomId, tabDomId } from '../_shared/CrmTabs';
import { FilterChips, type FilterChip } from '../_shared/FilterChips';
import { Pager } from '../_shared/Pager';
import { ConfirmDialog } from '../_shared/ConfirmDialog';
import { datedFilename, downloadCsv } from '../_shared/crm-download';
import { notifySoon } from '../_shared/crm-notify';
import { clampPage, sliceFor, type PageSize } from '../_shared/crm-paging';
import { prune, setMany, toggleId } from '../_shared/crm-selection';
import { plural } from '../_shared/crm-text';
import { useDebouncedValue } from '../_shared/use-debounced-value';
import { AddContactDialog } from './AddContactDialog';
import { ContactsBulk } from './ContactsBulk';
import { ContactsEmpty } from './ContactsEmpty';
import { ContactsHead } from './ContactsHead';
import { ContactsSkeleton } from './ContactsSkeleton';
import { ContactsTable } from './ContactsTable';
import { ContactsToolbar } from './ContactsToolbar';
import { ImportDialog } from './ImportDialog';
import {
  EMPTY_FILTERS, collectSources, collectTags, contactsToCsv, filterContacts, sortContacts, sourceLabel,
  type ContactFilters, type SortKey,
} from './contact-model';
import { useContacts } from './use-contacts';

type Dialog = { kind: 'none' } | { kind: 'add'; tag?: string } | { kind: 'import' } | { kind: 'delete' };

const LIST_TABS = [{ id: 'todo', label: 'Todo', icon: Layers }] as const;

/** Pestaña «Listas inteligentes»: lista real de contactos con búsqueda, filtros, orden, paginación y selección. */
export function ContactsTab() {
  const data = useContacts();
  const { contacts } = data;
  const [filters, setFilters] = useState<ContactFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const [busy, setBusy] = useState(false);

  const q = useDebouncedValue(filters.q, 150);
  const effective = useMemo<ContactFilters>(() => ({ ...filters, q }), [filters, q]);
  const filtered = useMemo(() => sortContacts(filterContacts(contacts, effective), sort), [contacts, effective, sort]);
  const current = clampPage(page, filtered.length, pageSize);
  const rows = useMemo(() => sliceFor(filtered, current, pageSize), [filtered, current, pageSize]);
  const selected = useMemo(() => prune(picked, contacts.map((c) => c.id)), [picked, contacts]);
  const sources = useMemo(() => collectSources(contacts), [contacts]);
  const tags = useMemo(() => collectTags(contacts), [contacts]);

  function changeFilters(next: ContactFilters) { setFilters(next); setPage(1); }
  function resetFilters() { changeFilters(EMPTY_FILTERS); }
  const close = () => setDialog({ kind: 'none' });

  const chips: FilterChip[] = [];
  if (filters.q.trim()) chips.push({ key: 'q', label: `Búsqueda: ${filters.q.trim()}`, onRemove: () => changeFilters({ ...filters, q: '' }) });
  if (filters.source) chips.push({ key: 'source', label: `Fuente: ${sourceLabel(filters.source)}`, onRemove: () => changeFilters({ ...filters, source: '' }) });
  if (filters.tag) chips.push({ key: 'tag', label: `Etiqueta: ${filters.tag}`, onRemove: () => changeFilters({ ...filters, tag: '' }) });

  async function runBulk<T extends { done: number; failed: number }>(job: () => Promise<T>, okText: (r: T) => string) {
    setBusy(true);
    const result = await job();
    setBusy(false);
    if (result.failed > 0) toast.error(`${okText(result)}; ${plural(result.failed, 'falló', 'fallaron')}.`);
    else toast.success(okText(result));
    return result;
  }

  async function confirmDelete() {
    const ids = Array.from(selected);
    await runBulk(() => data.remove(ids), (r) => `${plural(r.done, 'contacto eliminado', 'contactos eliminados')}`);
    setPicked(new Set());
    close();
  }

  const selectedContacts = contacts.filter((c) => selected.has(c.id));
  const initialLoad = data.loading && contacts.length === 0;
  const failedLoad = !initialLoad && data.error !== null && contacts.length === 0;
  const isEmpty = !initialLoad && !failedLoad && contacts.length === 0;

  return (
    <>
      <ContactsHead
        total={contacts.length}
        loading={initialLoad}
        refreshing={data.revalidating}
        onImport={() => setDialog({ kind: 'import' })}
        onAdd={() => setDialog({ kind: 'add' })}
        onRefresh={() => void data.refresh()}
      />
      <CrmTabs
        tabs={LIST_TABS}
        value="todo"
        onChange={() => undefined}
        idPrefix="lists"
        ariaLabel="Listas de contactos"
        trailing={
          <button type="button" className="ghost btn-sm" onClick={() => notifySoon('Listas inteligentes')}>
            <Plus size={14} aria-hidden="true" /> Añadir lista inteligente
          </button>
        }
      />
      <div role="tabpanel" id={panelDomId('lists', 'todo')} aria-labelledby={tabDomId('lists', 'todo')} className="crm-panel">
        {failedLoad && (
          <p className="crm-banner" role="alert">
            <TriangleAlert size={16} aria-hidden="true" />
            <span>No se pudieron cargar los contactos: {data.error}</span>
            <button type="button" className="secondary btn-sm" onClick={() => void data.refresh()}>
              <RotateCw size={12} aria-hidden="true" /> Reintentar
            </button>
          </p>
        )}
        {initialLoad && <ContactsSkeleton />}
        {(contacts.length > 0 || isEmpty) && (
          <>
            <ContactsToolbar filters={filters} onFilters={changeFilters} sort={sort} onSort={setSort} sources={sources} tags={tags} />
            <FilterChips chips={chips} onClear={resetFilters} />
            <ContactsBulk
              count={selected.size}
              busy={busy}
              onClear={() => setPicked(new Set())}
              onExport={() => downloadCsv(datedFilename('contactos'), contactsToCsv(selectedContacts))}
              onTag={(tag) => void runBulk(() => data.addTag(selectedContacts, tag), (r) => `Etiqueta «${tag.trim()}» aplicada a ${plural(r.done, 'contacto', 'contactos')}`)}
              onDelete={() => setDialog({ kind: 'delete' })}
            />
            <ContactsTable
              rows={rows}
              selected={selected}
              onToggle={(id) => setPicked(toggleId(selected, id))}
              onToggleAll={(checked) => setPicked(setMany(selected, rows.map((r) => r.id), checked))}
              onResetFilters={resetFilters}
              emptyNode={isEmpty ? <ContactsEmpty onImport={() => setDialog({ kind: 'import' })} onAdd={(tag) => setDialog({ kind: 'add', tag })} /> : undefined}
            />
            {contacts.length > 0 && (
              <Pager total={filtered.length} page={current} pageSize={pageSize} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} />
            )}
          </>
        )}
      </div>

      {dialog.kind === 'add' && (
        <AddContactDialog
          presetTag={dialog.tag}
          onClose={close}
          onCreate={(input, tag) => data.create(input, 'manual', tag)}
        />
      )}
      {dialog.kind === 'import' && <ImportDialog onClose={close} onImport={(items) => data.createMany(items, 'import')} />}
      {dialog.kind === 'delete' && (
        <ConfirmDialog
          title={`Eliminar ${plural(selected.size, 'contacto', 'contactos')}`}
          text="Se borrarán también sus conversaciones, mensajes, notas y tareas. Esta acción no se puede deshacer."
          confirmLabel="Eliminar definitivamente"
          busy={busy}
          onConfirm={() => void confirmDelete()}
          onClose={close}
        />
      )}
    </>
  );
}
