'use client';

/**
 * ModulePlaceholder — esqueleto reutilizable para módulos del CRM en construcción.
 * Renderiza header + sub-tabs (opcionales) + empty state.
 * Botones son cosméticos: muestran toast('Próximamente').
 */

import React, { useState } from 'react';
import {
  Plus,
  Upload,
  MoreVertical,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Settings,
  Construction,
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface ModuleTab {
  id: string;
  label: string;
  icon?: any;
}

export interface ModulePlaceholderProps {
  /** Icono principal del módulo (lucide-react) */
  icon: any;
  /** Nombre del módulo (h1) */
  title: string;
  /** Bajada breve debajo del título */
  subtitle?: string;
  /** Sub-tabs del módulo. La primera es la activa por defecto */
  tabs?: ModuleTab[];
  /** Texto principal del empty state mostrado en el área de contenido */
  emptyTitle?: string;
  /** Hint del empty state */
  emptyHint?: string;
  /** Mostrar botón Importar */
  showImport?: boolean;
  /** Etiqueta del botón primario (default: 'Agregar') */
  primaryLabel?: string;
  /** Mostrar toolbar (search/filtros) sobre el empty state */
  showToolbar?: boolean;
  /** Badge con conteo (ej: "0 elementos") */
  count?: number;
  /** Etiqueta del conteo (ej: "Contactos", "Empresas") */
  countLabel?: string;
}

export default function ModulePlaceholder({
  icon: Icon,
  title,
  subtitle,
  tabs = [],
  emptyTitle = 'Aún no hay datos',
  emptyHint = 'Esta sección está disponible en tu MVP. Pronto se conectarán los datos reales.',
  showImport = false,
  primaryLabel = 'Agregar',
  showToolbar = true,
  count,
  countLabel,
}: ModulePlaceholderProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');

  return (
    <div className="container">
      {/* Page heading */}
      <div className="row-between mb-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <Icon size={20} color="var(--rai-gold)" />
            <h1 className="h1" style={{ margin: 0 }}>{title}</h1>
            {count !== undefined && (
              <span className="badge badge-gold">
                {count} {countLabel ?? ''}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{subtitle}</p>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {showImport && (
            <button className="secondary" onClick={() => toast('Próximamente')}>
              <Upload size={14} /> Importar
            </button>
          )}
          <button className="primary" onClick={() => toast('Próximamente')}>
            <Plus size={14} /> {primaryLabel}
          </button>
          <button className="ghost btn-icon" aria-label="Más" onClick={() => toast('Próximamente')}>
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div
          className="row"
          style={{
            gap: 4,
            borderBottom: '1px solid var(--rai-border)',
            marginBottom: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {tabs.map(({ id, label, icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="ghost"
              style={{
                padding: '12px 16px',
                borderBottom: activeTab === id ? '2px solid var(--rai-gold)' : '2px solid transparent',
                color: activeTab === id ? 'var(--rai-gold)' : 'var(--rai-muted)',
                fontSize: 14,
                fontWeight: activeTab === id ? 600 : 500,
              }}
            >
              {TabIcon && <TabIcon size={14} />} {label}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {showToolbar && (
        <div className="row-between mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <button className="secondary btn-sm" onClick={() => toast('Próximamente')}>
              <SlidersHorizontal size={14} /> Filtros avanzados
            </button>
            <button className="secondary btn-sm" onClick={() => toast('Próximamente')}>
              <ArrowUpDown size={14} /> Ordenar
            </button>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--rai-muted)' }} />
              <input
                className="input"
                placeholder="Buscar"
                style={{ paddingLeft: 30, width: 240, height: 32 }}
              />
            </div>
            <button className="secondary btn-sm" onClick={() => toast('Próximamente')}>
              <Settings size={14} /> Administrar campos
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      <div className="card" style={{ padding: 0 }}>
        <div
          style={{
            padding: '80px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            color: 'var(--rai-muted)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(201,168,76,0.08)',
              border: '1px solid var(--rai-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={26} color="var(--rai-gold)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--rai-text)' }}>{emptyTitle}</div>
          <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 420 }}>{emptyHint}</div>
          <span className="badge badge-muted" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Construction size={11} /> Disponible en próximas iteraciones
          </span>
        </div>
      </div>
    </div>
  );
}
