'use client';

import React from 'react';
import { Camera, Image as ImageIcon, Upload, X } from 'lucide-react';
import type { ContentPlannerConfig } from '@/lib/content-planner-config';
import { Field } from '../Field';
import { LOGO_MODE_OPTIONS, PHOTO_MODE_OPTIONS } from '../constants';
import type { ConfigSetter } from '../types';

interface Props {
  config: ContentPlannerConfig;
  photos: string[];
  onChange: ConfigSetter;
  onPhotos: (update: (prev: string[]) => string[]) => void;
}

export function PhotosCard({ config, photos, onChange, onPhotos }: Props) {
  return (
    <section id="cfg-fotos" className="card rai-cfg-card" aria-labelledby="cfg-fotos-title">
      <h3 className="rai-cfg-title" id="cfg-fotos-title">
        <Camera size={16} aria-hidden="true" style={{ color: 'var(--rai-success)' }} /> Fotos y recursos
      </h3>
      <div className="rai-fields">
        <Field label="Modo de imágenes">
          {({ id }) => (
            <select id={id} className="input" value={config.photoMode} onChange={(e) => onChange('photoMode', e.target.value)}>
              {PHOTO_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </Field>
        <Field label="Logo en imágenes">
          {({ id }) => (
            <select id={id} className="input" value={config.logoMode} onChange={(e) => onChange('logoMode', e.target.value)}>
              {LOGO_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </Field>
      </div>

      <div className="ig-drop">
        <p className="ig-card-lead">
          Sube fotos reales de tu negocio. La IA las referenciará por nombre al planificar contenido. Usa nombres descriptivos (por ejemplo: suite-principal-01.jpg, piscina-dia.jpg, fachada-noche.jpg).
        </p>
        <label className="ig-upload">
          <Upload size={14} aria-hidden="true" /> Subir fotos
          <input
            type="file"
            className="ig-upload-input"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                const names = Array.from(files).map((f) => f.name);
                onPhotos((prev) => [...prev, ...names.filter((n) => !prev.includes(n))]);
              }
              e.target.value = '';
            }}
          />
        </label>
        {photos.length > 0 && (
          <ul className="ig-chips" aria-label="Fotos cargadas">
            {photos.map((name, i) => (
              <li key={`${name}-${i}`} className="ig-chip">
                <ImageIcon size={12} aria-hidden="true" />
                <span>{name}</span>
                <button type="button" className="ig-icon-btn" aria-label={`Quitar la foto ${name}`} onClick={() => onPhotos((prev) => prev.filter((_, idx) => idx !== i))}>
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
