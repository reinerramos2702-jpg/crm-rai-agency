'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Mail,
  FileText,
  Timer,
  Link2,
  Palette,
  Megaphone,
  Users,
  Plus,
  ExternalLink,
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: any;
  description: string;
  cards: { title: string; subtitle: string; status: string; statusLabel: string }[];
}

const TABS: TabItem[] = [
  {
    id: 'social',
    label: 'Planificador de Redes',
    icon: Calendar,
    description: 'Programa y organiza publicaciones para Instagram, TikTok, Facebook y más desde un solo calendario.',
    cards: [],
  },
  {
    id: 'emails',
    label: 'Correos Electrónicos',
    icon: Mail,
    description: 'Crea y envía campañas de email marketing, newsletters y secuencias automáticas.',
    cards: [],
  },
  {
    id: 'snippets',
    label: 'Fragmentos',
    icon: FileText,
    description: 'Guarda textos, captions, hashtags y respuestas frecuentes para reutilizar al instante.',
    cards: [],
  },
  {
    id: 'countdown',
    label: 'Cuenta Atrás',
    icon: Timer,
    description: 'Crea temporizadores de urgencia para lanzamientos, ofertas flash y eventos.',
    cards: [],
  },
  {
    id: 'links',
    label: 'Enlaces de Activación',
    icon: Link2,
    description: 'Enlaces cortos rastreables para bio de Instagram, anuncios y campañas.',
    cards: [],
  },
  {
    id: 'brand',
    label: 'Paneles de Marca',
    icon: Palette,
    description: 'Centraliza colores, logos, tipografías y guías de voz de cada marca gestionada.',
    cards: [],
  },
  {
    id: 'ads',
    label: 'Administrador de Anuncios',
    icon: Megaphone,
    description: 'Supervisa campañas de Meta Ads, TikTok Ads y Google Ads desde un panel unificado.',
    cards: [],
  },
  {
    id: 'prospecting',
    label: 'Prospección',
    icon: Users,
    description: 'Encuentra y organiza leads potenciales para tus campañas de outreach.',
    cards: [],
  },
];

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="container">
      <div className="row-between mb-6">
        <div>
          <h1 className="h1">Marketing</h1>
          <p className="muted mt-2">Gestiona contenido, campañas, anuncios y prospección desde un solo lugar.</p>
        </div>
        <button className="primary">
          <Plus size={16} />
          Nuevo
        </button>
      </div>

      <div
        className="row"
        style={{
          gap: 8,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--rai-border)',
          paddingBottom: 16,
          marginBottom: 24,
        }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === activeTab;
          return (
            <button
              key={id}
              className={isActive ? 'primary' : 'ghost'}
              onClick={() => setActiveTab(id)}
              style={{ fontSize: 13 }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="card mb-6">
        <p className="muted">{tab.description}</p>
      </div>

      {tab.cards.length === 0 && (
        <div className="card mb-4" style={{ textAlign: 'center', color: 'var(--rai-muted)', fontSize: 13, padding: 32 }}>
          Todavía no hay datos en esta sección. Crea el primero para empezar.
        </div>
      )}

      <div className="grid grid-3">
        {tab.cards.map((c, i) => (
          <div key={i} className="card">
            <div className="card-header" style={{ marginBottom: 8, paddingBottom: 8 }}>
              <h3 style={{ fontSize: 14 }}>{c.title}</h3>
              <span className={`badge ${c.status}`}>{c.statusLabel}</span>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>{c.subtitle}</p>
          </div>
        ))}
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed var(--rai-border)',
            color: 'var(--rai-muted)',
            cursor: 'pointer',
            minHeight: 90,
          }}
        >
          <div className="row" style={{ gap: 6 }}>
            <Plus size={16} />
            Agregar
          </div>
        </div>
      </div>

      <div className="mt-6 muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ExternalLink size={12} />
        Sección en construcción — próximamente conexión con Meta Business Suite, Google Ads y proveedores de email.
      </div>
    </div>
  );
}
