'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import type { ContentPlannerConfig } from '@/lib/content-planner-config';
import { Field } from '../Field';
import type { ConfigSetter } from '../types';

interface Props {
  config: ContentPlannerConfig;
  onChange: ConfigSetter;
}

export function BusinessCard({ config, onChange }: Props) {
  return (
    <section id="cfg-negocio" className="card rai-cfg-card" aria-labelledby="cfg-negocio-title">
      <h3 className="rai-cfg-title" id="cfg-negocio-title">
        <MapPin size={16} aria-hidden="true" style={{ color: 'var(--rai-gold)' }} /> Datos del negocio
      </h3>
      <p className="ig-card-lead">Esta información se inyecta automáticamente al planificador IA para generar contenido preciso.</p>
      <div className="rai-fields">
        <Field label="Nombre del negocio" hint="Así firmará la IA tus textos.">
          {({ id, describedBy }) => (
            <input id={id} aria-describedby={describedBy} className="input" placeholder="Nombre de tu empresa" value={config.businessName} onChange={(e) => onChange('businessName', e.target.value)} />
          )}
        </Field>
        <Field label="Tipo de negocio">
          {({ id }) => (
            <input id={id} className="input" placeholder="Restaurante, hotel, tienda, clínica…" value={config.businessType} onChange={(e) => onChange('businessType', e.target.value)} />
          )}
        </Field>
        <Field label="Ubicación">
          {({ id }) => (
            <input id={id} className="input" placeholder="Ciudad, país" value={config.businessLocation} onChange={(e) => onChange('businessLocation', e.target.value)} />
          )}
        </Field>
        <Field label="Sitio web">
          {({ id }) => (
            <input id={id} className="input" type="text" inputMode="url" placeholder="www.ejemplo.com" value={config.businessWebsite} onChange={(e) => onChange('businessWebsite', e.target.value)} />
          )}
        </Field>
        <Field label="Teléfono">
          {({ id }) => (
            <input id={id} className="input" type="tel" placeholder="+58 212 000 0000" value={config.businessPhone} onChange={(e) => onChange('businessPhone', e.target.value)} />
          )}
        </Field>
        <Field label="WhatsApp">
          {({ id }) => (
            <input id={id} className="input" type="tel" placeholder="+58 412 000 0000" value={config.businessWhatsApp} onChange={(e) => onChange('businessWhatsApp', e.target.value)} />
          )}
        </Field>
      </div>
      <Field className="ig-field--block" label="Servicios o productos principales">
        {({ id }) => (
          <textarea id={id} className="input ig-textarea" rows={3} placeholder="Ej.: lista de productos o servicios principales, qué incluye cada uno, qué los diferencia…" value={config.services} onChange={(e) => onChange('services', e.target.value)} />
        )}
      </Field>
      <Field className="ig-field--block" label="Cliente ideal o público objetivo">
        {({ id }) => (
          <textarea id={id} className="input ig-textarea" rows={2} placeholder="Ej.: edad, intereses, ciudad, qué problema resuelves para ellos…" value={config.targetAudience} onChange={(e) => onChange('targetAudience', e.target.value)} />
        )}
      </Field>
      <Field className="ig-field--block" label="Competidores principales (opcional)">
        {({ id }) => (
          <input id={id} className="input" placeholder="@competidor1, @competidor2…" value={config.competitors} onChange={(e) => onChange('competitors', e.target.value)} />
        )}
      </Field>
    </section>
  );
}
