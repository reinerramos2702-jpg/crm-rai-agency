'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  DEFAULT_NAME_TEMPLATE,
  applyNameTemplate,
  type AutoRefreshSeconds,
  type DisplayZone,
  type FlowSort,
  type RowDensity,
} from '@/lib/automation-prefs';
import { useAutomationPrefs } from '../use-automation-prefs';
import '../settings.css';

export function PrefsCard() {
  const { prefs, update, reset } = useAutomationPrefs();
  const [template, setTemplate] = useState(prefs.nameTemplate);
  const valid = template.includes('{nombre}');

  useEffect(() => setTemplate(prefs.nameTemplate), [prefs.nameTemplate]);

  const commitTemplate = () => {
    const next = template.trim();
    if (next.includes('{nombre}')) update({ nameTemplate: next.slice(0, 80) });
    else setTemplate(prefs.nameTemplate);
  };

  return (
    <div className="st-card">
      <h3 className="st-card-title"><SlidersHorizontal size={16} /> Preferencias de vista</h3>
      <p className="st-card-text">Se guardan en este navegador y solo cambian cómo ves el módulo; no afectan a tu equipo.</p>
      <div className="st-prefs">
        <div className="st-pref">
          <div className="st-pref-text">
            <strong>Orden de los flujos</strong>
            <span>Cómo se ordena la lista en la pestaña Flujos.</span>
          </div>
          <select className="au-select" aria-label="Orden de los flujos" value={prefs.flowSort} onChange={(e) => update({ flowSort: e.target.value as FlowSort })}>
            <option value="recientes">Modificados recientemente</option>
            <option value="nombre">Nombre (A–Z)</option>
            <option value="ejecuciones">Más ejecutados</option>
          </select>
        </div>
        <div className="st-pref">
          <div className="st-pref-text">
            <strong>Mostrar descripciones</strong>
            <span>Oculta el texto bajo el nombre para ver más flujos a la vez.</span>
          </div>
          <button type="button" role="switch" aria-checked={prefs.showDescriptions} aria-label="Mostrar descripciones" className="au-switch" onClick={() => update({ showDescriptions: !prefs.showDescriptions })}>
            <span className="au-switch-knob" />
          </button>
        </div>
        <div className="st-pref">
          <div className="st-pref-text">
            <strong>Densidad de la lista</strong>
            <span>«Compacta» reduce el alto de cada fila para ver más flujos sin desplazarte.</span>
          </div>
          <select className="au-select" aria-label="Densidad de la lista" value={prefs.density} onChange={(e) => update({ density: e.target.value as RowDensity })}>
            <option value="comfortable">Cómoda</option>
            <option value="compact">Compacta</option>
          </select>
        </div>
        <div className="st-pref">
          <div className="st-pref-text">
            <strong>Zona horaria de las fechas exactas</strong>
            <span>Se usa al pasar el cursor sobre una hora relativa y en el detalle de cada ejecución.</span>
          </div>
          <select className="au-select" aria-label="Zona horaria" value={prefs.displayZone} onChange={(e) => update({ displayZone: e.target.value as DisplayZone })}>
            <option value="America/Caracas">Caracas (UTC−4)</option>
            <option value="local">La de mi dispositivo</option>
          </select>
        </div>
        <div className="st-pref">
          <div className="st-pref-text">
            <strong>Actualizar Actividad automáticamente</strong>
            <span>Mientras la pestaña esté visible, recarga el historial por detrás.</span>
          </div>
          <select className="au-select" aria-label="Actualización automática" value={prefs.activityRefresh} onChange={(e) => update({ activityRefresh: Number(e.target.value) as AutoRefreshSeconds })}>
            <option value={0}>No actualizar</option>
            <option value={30}>Cada 30 segundos</option>
            <option value={60}>Cada minuto</option>
          </select>
        </div>
        <div className="st-pref st-pref--stack">
          <div className="st-pref-text">
            <strong>Nombre de los flujos nuevos</strong>
            <span>Usa {'{nombre}'} para el nombre base y {'{fecha}'} para la fecha de hoy.</span>
          </div>
          <div className="st-pref-field">
            <input
              value={template}
              maxLength={80}
              aria-label="Plantilla de nombre"
              aria-invalid={!valid}
              placeholder={DEFAULT_NAME_TEMPLATE}
              onChange={(e) => setTemplate(e.target.value)}
              onBlur={commitTemplate}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <span className="st-preview">
              {valid ? <>Ejemplo: <b>{applyNameTemplate(template.trim(), 'Bienvenida a nuevo lead')}</b></> : 'Debe incluir {nombre}.'}
            </span>
          </div>
        </div>
      </div>
      <div className="st-foot">
        <button type="button" className="au-btn au-btn--ghost au-btn--sm" onClick={reset}>
          <RotateCcw size={13} /> Restablecer preferencias
        </button>
      </div>
    </div>
  );
}
