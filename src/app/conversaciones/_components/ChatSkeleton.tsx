import React from 'react';
import { TOP_TABS } from './top-tabs-config';
import { ListSkeleton } from './ListSkeleton';

/** Estructura completa de la pantalla mientras se resuelve la ruta (la usa loading.tsx). */
export function ChatSkeleton() {
  return (
    <div className="cv-page" aria-busy="true">
      <span className="fx-sr-only" role="status">Cargando Conversaciones…</span>
      <header className="cv-head">
        <h1 className="cv-title">Conversaciones</h1>
        <div className="cv-tabs" aria-hidden="true">
          {TOP_TABS.map(({ id, label, icon: Icon }, i) => (
            <span key={id} className="cv-tab" data-current={i === 0 || undefined}>
              <Icon size={14} /> {label}
            </span>
          ))}
        </div>
      </header>
      <div className="cv-body">
        <div className="cv-shell" data-view="list">
          <section className="cv-col cv-list" aria-hidden="true">
            <div className="cv-list-head">
              <span className="fx-shimmer cv-sk-line" style={{ width: '40%' }} />
              <span className="fx-shimmer cv-sk-input" />
              <span className="fx-shimmer cv-sk-input" />
            </div>
            <div className="cv-list-body"><ListSkeleton /></div>
          </section>
          <section className="cv-col cv-thread" aria-hidden="true" />
          <aside className="cv-col cv-rail" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
