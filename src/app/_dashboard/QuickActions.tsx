'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { MAX_PINS, availablePins, movePin, resolvePins, togglePin } from '@/lib/dashboard-pins';
import { QUICK_ACTION_ICONS } from './quick-action-icons';

interface QuickActionsProps {
  pins: string[];
  role: string | null;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onPinsChange: (pins: string[]) => void;
}

/** Accesos rápidos fijables y reordenables por persona (se guardan en este navegador). */
export function QuickActions({ pins, role, editing, onEditingChange, onPinsChange }: QuickActionsProps) {
  const actions = resolvePins(pins, role);
  const extra = availablePins(pins, role);

  return (
    <section className="dsh-qa" aria-label="Accesos rápidos">
      <div className="dsh-sec-head">
        <h2>Accesos rápidos</h2>
        <button
          type="button"
          className="dsh-btn-link dsh-spacer"
          onClick={() => onEditingChange(!editing)}
          aria-pressed={editing}
          data-tour="dash-customize"
        >
          {editing ? 'Listo' : 'Personalizar'}
        </button>
      </div>

      <nav className="dash-actions" data-tour="dash-actions" aria-label="Accesos rápidos">
        {actions.map((a, i) => {
          const Icon = QUICK_ACTION_ICONS[a.icon];
          if (!editing) {
            return (
              <Link key={a.id} href={a.href} className={`dash-action is-${a.tone}`}>
                <span className="dash-action-ico"><Icon size={18} /></span>
                <span className="dash-action-text"><strong>{a.label}</strong><small>{a.hint}</small></span>
                <ArrowUpRight size={15} className="dash-action-arrow" aria-hidden="true" />
              </Link>
            );
          }
          return (
            <div key={a.id} className={`dash-action dsh-qa-edit is-${a.tone}`}>
              <span className="dash-action-ico"><Icon size={18} /></span>
              <span className="dash-action-text"><strong>{a.label}</strong></span>
              <span className="dsh-qa-tools">
                <button type="button" className="dsh-icon-btn" aria-label={`Mover ${a.label} antes`} disabled={i === 0} onClick={() => onPinsChange(movePin(pins, a.id, -1))}>
                  <ChevronLeft size={14} />
                </button>
                <button type="button" className="dsh-icon-btn" aria-label={`Mover ${a.label} después`} disabled={i === actions.length - 1} onClick={() => onPinsChange(movePin(pins, a.id, 1))}>
                  <ChevronRight size={14} />
                </button>
                <button type="button" className="dsh-icon-btn is-danger" aria-label={`Quitar ${a.label}`} onClick={() => onPinsChange(togglePin(pins, a.id))}>
                  <X size={14} />
                </button>
              </span>
            </div>
          );
        })}
        {actions.length === 0 && <p className="dsh-muted">No hay accesos fijados. Pulsa «Personalizar» para añadir los que más usas.</p>}
      </nav>

      {editing && (
        <div className="dsh-qa-add" role="group" aria-label="Añadir accesos">
          <span className="dsh-muted">{pins.length >= MAX_PINS ? `Máximo ${MAX_PINS} accesos` : 'Añadir:'}</span>
          {extra.map((a) => (
            <button key={a.id} type="button" className="dsh-chip" disabled={pins.length >= MAX_PINS} onClick={() => onPinsChange(togglePin(pins, a.id))}>
              <Plus size={12} aria-hidden="true" /> {a.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
