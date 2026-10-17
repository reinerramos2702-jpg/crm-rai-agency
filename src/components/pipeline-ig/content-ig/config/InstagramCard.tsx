'use client';

import React, { useMemo } from 'react';
import { Instagram } from 'lucide-react';
import type { ContentPlannerConfig } from '@/lib/content-planner-config';
import { Field } from '../Field';
import type { ConfigSetter } from '../types';
import type { MetaState } from '../useMetaStatus';
import { listTimezones } from '../utils';

interface Props {
  config: ContentPlannerConfig;
  meta: MetaState;
  onChange: ConfigSetter;
}

const META_LABELS: Record<MetaState, string> = {
  connected: 'Instagram conectado',
  disconnected: 'Instagram sin conectar',
  unknown: 'Conexión: sin datos',
};

export function InstagramCard({ config, meta, onChange }: Props) {
  const zones = useMemo(() => listTimezones(config.timezone), [config.timezone]);
  return (
    <section id="cfg-instagram" className="card rai-cfg-card" aria-labelledby="cfg-instagram-title">
      <h3 className="rai-cfg-title" id="cfg-instagram-title">
        <Instagram size={16} aria-hidden="true" style={{ color: '#E4405F' }} /> Configuración de Instagram
        <span className={`rai-conn-chip ${meta === 'connected' ? 'is-ok' : ''}`}>{META_LABELS[meta]}</span>
      </h3>
      <div className="rai-fields rai-fields-3">
        <Field label="Cuenta de Instagram" hint="Tu usuario público; con o sin @ funciona.">
          {({ id, describedBy }) => (
            <input id={id} aria-describedby={describedBy} className="input" placeholder="@tu_cuenta" value={config.igHandle} onChange={(e) => onChange('igHandle', e.target.value)} />
          )}
        </Field>
        <Field label="Hora de publicación por defecto" hint="Hora a la que saldrá cada publicación.">
          {({ id, describedBy }) => (
            <input id={id} aria-describedby={describedBy} className="input" type="time" value={config.publishTime} onChange={(e) => onChange('publishTime', e.target.value)} />
          )}
        </Field>
        <Field label="Zona horaria" hint="La de tu audiencia.">
          {({ id, describedBy }) => (
            <select id={id} aria-describedby={describedBy} className="input" value={config.timezone} onChange={(e) => onChange('timezone', e.target.value)}>
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          )}
        </Field>
      </div>
      <div className="rai-switch-row" data-tour="auto-switch">
        <button
          type="button"
          role="switch"
          aria-checked={config.autoPublish}
          aria-labelledby="ig-auto-title"
          aria-describedby="ig-auto-text"
          disabled
          className={`rai-switch ${config.autoPublish ? 'is-on' : ''}`}
        >
          <span className="rai-switch-knob" />
        </button>
        <div>
          <div className="ig-switch-title" id="ig-auto-title">
            Publicación automática en Instagram <span className="rai-soon-tag">Próximamente</span>
          </div>
          <div className="ig-switch-text" id="ig-auto-text">
            Al activarla, el CRM publicará cada día lo que dejes programado, sin que tengas que entrar. Requiere conectar tu cuenta de Instagram Business.
          </div>
        </div>
      </div>
    </section>
  );
}
