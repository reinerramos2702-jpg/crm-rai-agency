'use client';

import React, { useState } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { BrandRule } from '@/lib/content-planner-config';
import { Field } from '../Field';

interface Props {
  rules: BrandRule[];
  onChange: (rules: BrandRule[]) => void;
}

export function RulesCard({ rules, onChange }: Props) {
  const [forbidden, setForbidden] = useState('');
  const [replacement, setReplacement] = useState('');
  const [reason, setReason] = useState('');
  const canAdd = forbidden.trim() !== '' && replacement.trim() !== '';

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    onChange([...rules, { forbidden: forbidden.trim(), replacement: replacement.trim(), reason: reason.trim() }]);
    setForbidden('');
    setReplacement('');
    setReason('');
  };

  return (
    <section id="cfg-reglas" className="card rai-cfg-card" aria-labelledby="cfg-reglas-title">
      <h3 className="rai-cfg-title" id="cfg-reglas-title">
        <AlertCircle size={16} aria-hidden="true" style={{ color: 'var(--rai-error)' }} /> Reglas de lenguaje de marca
      </h3>
      <p className="ig-card-lead">
        Palabras prohibidas y sus reemplazos. El planificador IA evitará estas palabras y usará los reemplazos automáticamente.
      </p>

      {rules.length > 0 && (
        <div className="ig-rules" role="table" aria-label="Reglas de lenguaje">
          <div className="rai-rule-row rai-rule-head" role="row">
            <span role="columnheader">Prohibida</span>
            <span role="columnheader">Usar en su lugar</span>
            <span role="columnheader">Razón</span>
            <span role="columnheader"><span className="fx-sr-only">Acciones</span></span>
          </div>
          {rules.map((rule, i) => (
            <div key={`${rule.forbidden}-${i}`} className="rai-rule-row rai-rule-item" role="row">
              <span className="ig-rule-bad" role="cell">{rule.forbidden}</span>
              <span className="ig-rule-good" role="cell">{rule.replacement}</span>
              <span className="ig-rule-why" role="cell">{rule.reason}</span>
              <span role="cell">
                <button type="button" className="ig-icon-btn" aria-label={`Quitar la regla de «${rule.forbidden}»`} onClick={() => onChange(rules.filter((_, idx) => idx !== i))}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <form className="rai-rule-row rai-rule-add" onSubmit={add}>
        <Field label="Palabra prohibida">
          {({ id }) => <input id={id} className="input" placeholder="barato" value={forbidden} onChange={(e) => setForbidden(e.target.value)} />}
        </Field>
        <Field label="Reemplazo">
          {({ id }) => <input id={id} className="input" placeholder="accesible" value={replacement} onChange={(e) => setReplacement(e.target.value)} />}
        </Field>
        <Field label="Razón (opcional)">
          {({ id }) => <input id={id} className="input" placeholder="Suena a descuento, no a calidad" value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <button type="submit" className="ig-add-btn" disabled={!canAdd}>
          <Plus size={14} aria-hidden="true" /> Agregar
        </button>
      </form>
    </section>
  );
}
