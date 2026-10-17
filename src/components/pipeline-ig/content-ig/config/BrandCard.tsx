'use client';

import React from 'react';
import { FileText, Palette, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ContentPlannerConfig } from '@/lib/content-planner-config';
import { Field } from '../Field';
import { TONE_OPTIONS } from '../constants';
import type { ConfigSetter } from '../types';

interface Props {
  config: ContentPlannerConfig;
  onChange: ConfigSetter;
}

const DOC_LIMIT = 50000;

export function BrandCard({ config, onChange }: Props) {
  const readDoc = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      onChange('brandDocName', file.name);
      onChange('brandDocContent', text.slice(0, DOC_LIMIT));
    };
    reader.onerror = () => toast.error('No se pudo leer el archivo. Pega el contenido en el cuadro de texto.');
    reader.readAsText(file);
  };

  return (
    <section id="cfg-marca" className="card rai-cfg-card" aria-labelledby="cfg-marca-title">
      <h3 className="rai-cfg-title" id="cfg-marca-title">
        <Palette size={16} aria-hidden="true" style={{ color: 'var(--rai-purple)' }} /> Marca y estilo visual
      </h3>
      <div className="rai-fields">
        <Field label="Colores de marca" hint="Sepáralos con comas.">
          {({ id, describedBy }) => (
            <input id={id} aria-describedby={describedBy} className="input" placeholder="Azul oscuro, dorado, blanco…" value={config.brandColors} onChange={(e) => onChange('brandColors', e.target.value)} />
          )}
        </Field>
        <Field label="Tono de comunicación">
          {({ id }) => (
            <select id={id} className="input" value={config.brandTone} onChange={(e) => onChange('brandTone', e.target.value)}>
              {TONE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          )}
        </Field>
      </div>

      <div className="ig-drop">
        <div className="ig-drop-title"><FileText size={16} aria-hidden="true" style={{ color: 'var(--rai-gold)' }} /> Manual de marca o documento de referencia</div>
        <p className="ig-card-lead">
          Sube un archivo de texto o pega el contenido de tu manual de marca, brief, guía de estilo o cualquier documento informativo. El planificador IA lo usará como contexto para generar contenido alineado a tu marca.
        </p>
        {config.brandDocName ? (
          <div className="ig-file">
            <FileText size={14} aria-hidden="true" style={{ color: 'var(--rai-success)' }} />
            <span className="ig-file-name">{config.brandDocName}</span>
            <span className="ig-file-size">{(config.brandDocContent.length / 1024).toFixed(1)} KB</span>
            <button type="button" className="ig-icon-btn" aria-label="Quitar el documento de marca" onClick={() => { onChange('brandDocName', ''); onChange('brandDocContent', ''); }}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label className="ig-upload">
            <Upload size={14} aria-hidden="true" /> Subir archivo
            <input
              type="file"
              className="ig-upload-input"
              accept=".pdf,.txt,.md,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readDoc(file);
                e.target.value = '';
              }}
            />
          </label>
        )}
        <Field className="ig-field--block" label="O pega el contenido directamente">
          {({ id }) => (
            <textarea
              id={id}
              className="input ig-textarea ig-textarea--sm"
              rows={4}
              placeholder="Pega aquí tu manual de marca, brief del negocio, guía de estilo, información de servicios, precios, horarios, políticas…"
              value={config.brandDocContent}
              onChange={(e) => {
                onChange('brandDocContent', e.target.value);
                if (!config.brandDocName && e.target.value.length > 0) onChange('brandDocName', 'Documento pegado');
              }}
            />
          )}
        </Field>
      </div>
    </section>
  );
}
