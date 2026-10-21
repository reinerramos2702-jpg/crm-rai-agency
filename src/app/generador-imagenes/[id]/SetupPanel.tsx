'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Circle, FileText } from 'lucide-react';
import { SkeletonLine } from '@/components/ui/Skeleton';
import type { BrandDocInfo, ContentGrid, LlmProviderId, ThemeEntry } from '../types';
import { IMAGE_PROVIDERS, LLM_PROVIDERS, NODES } from './constants';

interface SetupPanelProps {
  grid: ContentGrid;
  themes: ThemeEntry[];
  /** `null` mientras carga el documento de marca. */
  brand: BrandDocInfo | null;
  provider: LlmProviderId;
  modelId: string;
  imageProvider: string;
  saving: boolean;
  /** Hay cambios en los temas todavía sin guardar. */
  unsaved: boolean;
  onThemeChange: (index: number, field: 'title' | 'category', value: string) => void;
  onSaveThemes: () => void;
  onProviderChange: (provider: LlmProviderId) => void;
  onModelChange: (modelId: string) => void;
  onImageProviderChange: (value: string) => void;
}

/** Columna de configuración: documento de marca, pipeline de 5 nodos, temas y modelos. */
export function SetupPanel({
  grid,
  themes,
  brand,
  provider,
  modelId,
  imageProvider,
  saving,
  unsaved,
  onThemeChange,
  onSaveThemes,
  onProviderChange,
  onModelChange,
  onImageProviderChange,
}: SetupPanelProps) {
  return (
    <aside className="gw-setup" aria-label="Configuración de la grilla">
      {/* Estado del documento de marca */}
      <div className={`gw-brand${brand && !brand.hasBrandDoc ? ' is-missing' : ''}`}>
        {brand === null ? (
          <SkeletonLine height={36} />
        ) : brand.hasBrandDoc ? (
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <CheckCircle2 size={16} color="var(--rai-success)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0 }}>
              <div className="gw-brand-title">Documento de marca activo</div>
              <div className="muted gw-brand-name">{brand.brandDocName}</div>
            </div>
          </div>
        ) : (
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="var(--rai-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0 }}>
              <div className="gw-brand-title">Falta el documento de marca</div>
              <p className="muted" style={{ marginTop: 2 }}>
                El asistente usa buenas prácticas generales y la calidad del copy no puede medir tu marca.
              </p>
              <Link href="/generador-imagenes" className="btn-secondary btn-sm" style={{ marginTop: 8 }}>
                <FileText size={13} /> Subir el .docx en la galería
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Stepper de 5 nodos */}
      <div>
        <p className="label gw-label">Pipeline — 5 nodos</p>
        <ol className="gw-nodes">
          {NODES.map((node) => {
            const isDone = node.n < grid.currentStep;
            const isCurrent = node.n === grid.currentStep;
            return (
              <li key={node.n} className={`gw-node${isCurrent ? ' is-current' : ''}`} aria-current={isCurrent ? 'step' : undefined}>
                {isDone ? (
                  <CheckCircle2 size={18} color="var(--rai-success)" style={{ flexShrink: 0 }} />
                ) : (
                  <Circle size={18} color={isCurrent ? 'var(--rai-gold)' : 'var(--rai-muted)'} style={{ flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div className="gw-node-title">{node.n}. {node.title}</div>
                  <div className="muted gw-node-hint">{node.hint}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Temas de la semana */}
      <div>
        <div className="row-between gw-label">
          <p className="label" style={{ margin: 0 }}>Temas de la semana</p>
          <button className="btn-ghost btn-sm" onClick={onSaveThemes} disabled={saving || !unsaved}>
            {unsaved ? 'Guardar' : 'Guardado'}
          </button>
        </div>
        <div className="gw-themes">
          {themes.map((t, i) => (
            <div key={i} className="gw-theme">
              <label className="muted gw-theme-day" htmlFor={`gw-title-${i}`}>Día {i + 1}</label>
              <input
                id={`gw-title-${i}`}
                placeholder="Título del tema"
                value={t.title}
                maxLength={120}
                onChange={(e) => onThemeChange(i, 'title', e.target.value)}
              />
              <input
                placeholder="Categoría"
                aria-label={`Categoría del día ${i + 1}`}
                value={t.category}
                maxLength={60}
                onChange={(e) => onThemeChange(i, 'category', e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Configuración de IA */}
      <div>
        <p className="label gw-label">Modelo de IA (chat)</p>
        <div className="form-group">
          <select
            aria-label="Proveedor de IA del chat"
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as LlmProviderId)}
          >
            {LLM_PROVIDERS.map((p) => (
              <option key={p.provider} value={p.provider}>{p.label}</option>
            ))}
          </select>
        </div>
        <select aria-label="Modelo de IA del chat" value={modelId} onChange={(e) => onModelChange(e.target.value)}>
          {LLM_PROVIDERS.find((p) => p.provider === provider)?.models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="label gw-label">Proveedor de imágenes</p>
        <select
          aria-label="Proveedor de imágenes"
          value={imageProvider}
          onChange={(e) => onImageProviderChange(e.target.value)}
        >
          {IMAGE_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
    </aside>
  );
}
