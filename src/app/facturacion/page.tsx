'use client';

import React, { useState } from 'react';
import {
  Receipt,
  FileSignature,
  Package,
  Link2,
  ArrowRightLeft,
  ShoppingBag,
  Tag,
  Gift,
  Settings,
  Plug,
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

const INTEGRATIONS = [
  { title: 'PayPal', subtitle: 'Procesa pagos y enlaces de cobro con PayPal.', status: 'muted', statusLabel: 'No conectado' },
  { title: 'Stripe', subtitle: 'Procesa tarjetas, suscripciones y facturación recurrente.', status: 'muted', statusLabel: 'No conectado' },
  { title: 'Mercado Pago', subtitle: 'Cobra en Latinoamérica con Mercado Pago.', status: 'muted', statusLabel: 'No conectado' },
];

const TABS: TabItem[] = [
  {
    id: 'invoices',
    label: 'Facturas y Estimaciones',
    icon: Receipt,
    description: 'Crea, envía y da seguimiento a facturas y presupuestos para tus clientes.',
    cards: [],
  },
  {
    id: 'contracts',
    label: 'Documentos y Contratos',
    icon: FileSignature,
    description: 'Gestiona contratos, propuestas y documentos legales con firma electrónica.',
    cards: [],
  },
  {
    id: 'orders',
    label: 'Pedidos',
    icon: Package,
    description: 'Visualiza y gestiona pedidos generados desde tus enlaces de pago y tienda.',
    cards: [],
  },
  {
    id: 'paylinks',
    label: 'Enlaces de Pago',
    icon: Link2,
    description: 'Genera enlaces de pago únicos o reutilizables para compartir por chat, email o redes.',
    cards: [],
  },
  {
    id: 'transactions',
    label: 'Transacciones',
    icon: ArrowRightLeft,
    description: 'Historial de pagos recibidos, reembolsos y movimientos por proveedor.',
    cards: [],
  },
  {
    id: 'products',
    label: 'Productos',
    icon: ShoppingBag,
    description: 'Catálogo de productos y servicios disponibles para facturar o vender.',
    cards: [],
  },
  {
    id: 'coupons',
    label: 'Cupones',
    icon: Tag,
    description: 'Crea códigos de descuento para campañas y promociones.',
    cards: [],
  },
  {
    id: 'giftcards',
    label: 'Gift Cards',
    icon: Gift,
    description: 'Emite y administra tarjetas de regalo para tus clientes.',
    cards: [],
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: Settings,
    description: 'Define moneda, impuestos, datos fiscales y plantillas de facturación.',
    cards: [],
  },
  {
    id: 'integrations',
    label: 'Integraciones',
    icon: Plug,
    description: 'Conecta proveedores de pago y facturación: PayPal, Stripe, Mercado Pago y más.',
    cards: [],
  },
];

export default function FacturacionPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="container">
      <div className="row-between mb-6">
        <div>
          <h1 className="h1">Facturación</h1>
          <p className="muted mt-2">Facturas, pagos, productos e integraciones en un solo lugar.</p>
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

      {tab.id !== 'integrations' && tab.cards.length === 0 && (
        <div className="card mb-4" style={{ textAlign: 'center', color: 'var(--rai-muted)', fontSize: 13, padding: 32 }}>
          Todavía no hay datos en esta sección. Crea el primero para empezar.
        </div>
      )}

      <div className="grid grid-3">
        {(tab.id === 'integrations' ? INTEGRATIONS : tab.cards).map((c, i) => (
          <div key={i} className="card">
            <div className="card-header" style={{ marginBottom: 8, paddingBottom: 8 }}>
              <h3 style={{ fontSize: 14 }}>{c.title}</h3>
              <span className={`badge ${c.status}`}>{c.statusLabel}</span>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: tab.id === 'integrations' ? 12 : 0 }}>
              {c.subtitle}
            </p>
            {tab.id === 'integrations' && (
              <button className="secondary btn-sm">
                <Plug size={14} />
                Conectar
              </button>
            )}
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
        Sección en construcción — próximamente conexión real con PayPal, Stripe y Mercado Pago.
      </div>
    </div>
  );
}
