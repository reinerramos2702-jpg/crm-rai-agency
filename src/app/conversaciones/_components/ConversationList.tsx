'use client';

import React from 'react';
import { RotateCw, Search, SearchX, UserPlus, X } from 'lucide-react';
import { ConversationRow } from './ConversationRow';
import { InlineError } from './InlineError';
import { ListSkeleton } from './ListSkeleton';
import type { Contact } from '../_lib/conv-types';

interface ConversationListProps {
  contacts: Contact[];
  total: number;
  unread: number;
  hasData: boolean;
  loading: boolean;
  error: string | null;
  revalidating: boolean;
  query: string;
  onQuery: (value: string) => void;
  unreadOnly: boolean;
  onUnreadOnly: (value: boolean) => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRetry: () => void;
}

function Body(props: ConversationListProps) {
  const { contacts, total, hasData, loading, error, query, activeId, onSelect, onNew, onRetry } = props;
  if (loading) return <ListSkeleton />;
  if (error && !hasData) {
    return <InlineError title="No se pudieron cargar las conversaciones" message={error} onRetry={onRetry} busy={props.revalidating} />;
  }
  if (total === 0) {
    return (
      <div className="cv-list-empty">
        <p className="cv-list-empty-title">Todavía no hay conversaciones</p>
        <p className="cv-list-empty-text">Crea un contacto para abrir la primera conversación.</p>
        <button type="button" className="primary btn-sm" onClick={onNew}>
          <UserPlus size={14} aria-hidden="true" /> Nuevo contacto
        </button>
      </div>
    );
  }
  if (contacts.length === 0) {
    return (
      <div className="cv-list-empty">
        <SearchX size={22} aria-hidden="true" className="cv-list-empty-icon" />
        <p className="cv-list-empty-title">Sin resultados</p>
        <p className="cv-list-empty-text">
          {query.trim() ? `Nada coincide con «${query.trim()}».` : 'No hay conversaciones sin leer.'}
        </p>
        <button type="button" className="ghost btn-sm" onClick={() => { props.onQuery(''); props.onUnreadOnly(false); }}>
          Quitar filtros
        </button>
      </div>
    );
  }
  return (
    <ul className="cv-rows" aria-label="Conversaciones" onKeyDown={moveFocus}>
      {contacts.map((contact) => (
        <li key={contact.id}>
          <ConversationRow contact={contact} active={contact.id === activeId} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}

/** Flechas arriba/abajo recorren las filas sin salir de la lista. */
function moveFocus(event: React.KeyboardEvent<HTMLUListElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const rows = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button.cv-row'));
  const index = rows.findIndex((row) => row === document.activeElement);
  if (index === -1) return;
  const next = rows[index + (event.key === 'ArrowDown' ? 1 : -1)];
  if (next) {
    event.preventDefault();
    next.focus();
  }
}

export function ConversationList(props: ConversationListProps) {
  const { query, onQuery, unreadOnly, onUnreadOnly, unread, total, hasData, error, revalidating, onRetry, onNew } = props;
  return (
    <section className="cv-col cv-list" aria-labelledby="cv-list-title">
      <header className="cv-list-head">
        <div className="cv-list-title-row">
          <h2 id="cv-list-title" className="cv-col-title">Bandeja</h2>
          <button
            type="button"
            className="ghost cv-icon-btn cv-tip"
            data-tip="Actualizar"
            aria-label="Actualizar la lista de conversaciones"
            onClick={onRetry}
            disabled={revalidating}
          >
            <RotateCw size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="cv-search">
          <Search size={14} aria-hidden="true" className="cv-search-icon" />
          <label htmlFor="cv-search-input" className="fx-sr-only">Buscar conversaciones</label>
          <input
            id="cv-search-input"
            type="search"
            placeholder="Buscar por nombre, correo o teléfono"
            autoComplete="off"
            maxLength={80}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="ghost cv-search-clear" aria-label="Borrar búsqueda" onClick={() => onQuery('')}>
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="cv-chips" role="group" aria-label="Filtrar conversaciones">
          <button type="button" className="cv-chip" aria-pressed={!unreadOnly} onClick={() => onUnreadOnly(false)}>
            Todas <span className="cv-chip-count">{total}</span>
          </button>
          <button type="button" className="cv-chip" aria-pressed={unreadOnly} onClick={() => onUnreadOnly(true)}>
            Sin leer <span className="cv-chip-count">{unread}</span>
          </button>
        </div>
        <button type="button" className="primary btn-sm cv-new" onClick={onNew}>
          <UserPlus size={14} aria-hidden="true" /> Nuevo contacto
        </button>
      </header>
      {error && hasData && (
        <InlineError compact title="No se pudo actualizar la lista" message={error} onRetry={onRetry} busy={revalidating} />
      )}
      <div className="cv-list-body" aria-busy={props.loading}>
        <Body {...props} />
      </div>
    </section>
  );
}
