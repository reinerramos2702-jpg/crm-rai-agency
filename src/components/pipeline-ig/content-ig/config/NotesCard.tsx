'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { Field } from '../Field';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function NotesCard({ value, onChange }: Props) {
  return (
    <section id="cfg-notas" className="card rai-cfg-card" aria-labelledby="cfg-notas-title">
      <h3 className="rai-cfg-title" id="cfg-notas-title">
        <FileText size={16} aria-hidden="true" style={{ color: 'var(--rai-muted)' }} /> Notas y contexto adicional
      </h3>
      <Field label="Información extra para el planificador">
        {({ id }) => (
          <textarea
            id={id}
            className="input ig-textarea"
            rows={3}
            placeholder="Promociones actuales, eventos próximos, temporada alta, restricciones de contenido, cosas que NO mencionar…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </Field>
    </section>
  );
}
