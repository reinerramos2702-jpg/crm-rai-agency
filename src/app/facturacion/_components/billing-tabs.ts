// Datos tipados de las pestañas de Facturación. Ninguna de ellas guarda datos propios todavía:
// solo «Transacciones» lee información real (los pagos ya registrados en el CRM).

import {
  ArrowRightLeft,
  FileSignature,
  Gift,
  Link2,
  Package,
  Plug,
  Receipt,
  Settings,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import type { ChipTone } from './billing-model';

export interface GhostChip {
  label: string;
  tone: ChipTone;
}

export type PreviewSpec =
  | { kind: 'document'; docLabel: string; chips: readonly GhostChip[] }
  | { kind: 'table'; columns: readonly string[]; chips: readonly GhostChip[] }
  | { kind: 'cards'; tag: string; chips: readonly GhostChip[] }
  | { kind: 'form'; fields: readonly string[] };

export type BillingTabId =
  | 'invoices'
  | 'contracts'
  | 'orders'
  | 'paylinks'
  | 'transactions'
  | 'products'
  | 'coupons'
  | 'giftcards'
  | 'settings'
  | 'integrations';

export interface BillingTab {
  id: BillingTabId;
  label: string;
  icon: LucideIcon;
  description: string;
  /** true solo cuando la pestaña muestra datos reales del CRM. */
  live: boolean;
  emptyTitle: string;
  emptyText: string;
  /** Texto de la acción principal (deshabilitada mientras no exista el módulo). */
  actionLabel: string;
  actionReason: string;
  preview: PreviewSpec;
}

const NOT_YET = 'Esta función se activará cuando exista la conexión con un proveedor de pagos.';

export const BILLING_TABS: readonly BillingTab[] = [
  {
    id: 'invoices',
    label: 'Facturas y Estimaciones',
    icon: Receipt,
    description: 'Crea, envía y da seguimiento a facturas y presupuestos para tus clientes.',
    live: false,
    emptyTitle: 'Aún no hay facturas ni estimaciones',
    emptyText: 'Así se verá una factura cuando esta función esté disponible: líneas, totales y su estado.',
    actionLabel: 'Crear factura',
    actionReason: NOT_YET,
    preview: {
      kind: 'document',
      docLabel: 'Factura',
      chips: [
        { label: 'Borrador', tone: 'muted' },
        { label: 'Enviada', tone: 'warning' },
        { label: 'Pagada', tone: 'success' },
      ],
    },
  },
  {
    id: 'contracts',
    label: 'Documentos y Contratos',
    icon: FileSignature,
    description: 'Gestiona contratos, propuestas y documentos legales con firma electrónica.',
    live: false,
    emptyTitle: 'Aún no hay documentos ni contratos',
    emptyText: 'Aquí verás cada contrato con su estado de firma cuando esta función esté disponible.',
    actionLabel: 'Crear documento',
    actionReason: 'La firma electrónica aún no está disponible; por eso todavía no se pueden crear documentos aquí.',
    preview: {
      kind: 'document',
      docLabel: 'Contrato',
      chips: [
        { label: 'Borrador', tone: 'muted' },
        { label: 'Enviado', tone: 'warning' },
        { label: 'Firmado', tone: 'success' },
      ],
    },
  },
  {
    id: 'orders',
    label: 'Pedidos',
    icon: Package,
    description: 'Visualiza y gestiona pedidos generados desde tus enlaces de pago y tienda.',
    live: false,
    emptyTitle: 'Aún no hay pedidos',
    emptyText: 'Los pedidos aparecerán aquí cuando existan enlaces de pago y tienda conectados.',
    actionLabel: 'Crear pedido',
    actionReason: 'Los pedidos nacen de enlaces de pago y tienda, que aún no están conectados.',
    preview: {
      kind: 'table',
      columns: ['Pedido', 'Cliente', 'Total', 'Estado'],
      chips: [
        { label: 'Pendiente', tone: 'warning' },
        { label: 'Pagado', tone: 'success' },
        { label: 'Entregado', tone: 'gold' },
      ],
    },
  },
  {
    id: 'paylinks',
    label: 'Enlaces de Pago',
    icon: Link2,
    description: 'Genera enlaces de pago únicos o reutilizables para compartir por chat, email o redes.',
    live: false,
    emptyTitle: 'Aún no hay enlaces de pago',
    emptyText: 'Cada enlace mostrará su estado y cuántas veces se usó cuando esta función esté disponible.',
    actionLabel: 'Crear enlace',
    actionReason: 'Un enlace de pago necesita un proveedor conectado (PayPal, Stripe o Mercado Pago).',
    preview: {
      kind: 'cards',
      tag: 'Enlace',
      chips: [
        { label: 'Activo', tone: 'success' },
        { label: 'Pausado', tone: 'muted' },
        { label: 'Vencido', tone: 'error' },
      ],
    },
  },
  {
    id: 'transactions',
    label: 'Transacciones',
    icon: ArrowRightLeft,
    description: 'Historial de pagos recibidos, reembolsos y movimientos por proveedor.',
    live: true,
    emptyTitle: 'Aún no hay transacciones registradas',
    emptyText: 'Los pagos que registres en el módulo Pagos aparecerán aquí con su estado.',
    actionLabel: 'Registrar pago',
    actionReason: NOT_YET,
    preview: {
      kind: 'table',
      columns: ['Referencia', 'Método', 'Monto', 'Estado'],
      chips: [
        { label: 'Pendiente', tone: 'warning' },
        { label: 'Pagado', tone: 'success' },
        { label: 'Reembolsado', tone: 'gold' },
      ],
    },
  },
  {
    id: 'products',
    label: 'Productos',
    icon: ShoppingBag,
    description: 'Catálogo de productos y servicios disponibles para facturar o vender.',
    live: false,
    emptyTitle: 'Aún no hay productos ni servicios',
    emptyText: 'Tu catálogo se verá así: nombre, precio y tipo. Servirá para armar facturas y enlaces de pago.',
    actionLabel: 'Agregar producto',
    actionReason: 'El catálogo se activará junto con las facturas: todavía no hay dónde guardarlo.',
    preview: {
      kind: 'table',
      columns: ['Producto', 'Precio', 'Tipo', 'Estado'],
      chips: [
        { label: 'Activo', tone: 'success' },
        { label: 'Archivado', tone: 'muted' },
      ],
    },
  },
  {
    id: 'coupons',
    label: 'Cupones',
    icon: Tag,
    description: 'Crea códigos de descuento para campañas y promociones.',
    live: false,
    emptyTitle: 'Aún no hay cupones',
    emptyText: 'Cada cupón mostrará su código, descuento y vigencia cuando esta función esté disponible.',
    actionLabel: 'Crear cupón',
    actionReason: 'Los cupones se aplican a pedidos y facturas, que aún no están disponibles.',
    preview: {
      kind: 'cards',
      tag: 'Cupón',
      chips: [
        { label: 'Activo', tone: 'success' },
        { label: 'Programado', tone: 'warning' },
        { label: 'Vencido', tone: 'muted' },
      ],
    },
  },
  {
    id: 'giftcards',
    label: 'Gift Cards',
    icon: Gift,
    description: 'Emite y administra tarjetas de regalo para tus clientes.',
    live: false,
    emptyTitle: 'Aún no hay tarjetas de regalo',
    emptyText: 'Verás el saldo y el estado de cada tarjeta emitida cuando esta función esté disponible.',
    actionLabel: 'Emitir tarjeta',
    actionReason: 'Emitir tarjetas requiere cobros reales; todavía no hay proveedor de pagos conectado.',
    preview: {
      kind: 'cards',
      tag: 'Tarjeta',
      chips: [
        { label: 'Activa', tone: 'success' },
        { label: 'Canjeada', tone: 'gold' },
        { label: 'Vencida', tone: 'muted' },
      ],
    },
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: Settings,
    description: 'Define moneda, impuestos, datos fiscales y plantillas de facturación.',
    live: false,
    emptyTitle: 'La configuración de facturación aún no está disponible',
    emptyText: 'Estos serán los ajustes que podrás definir. Hoy no se guarda nada en esta pantalla.',
    actionLabel: 'Guardar configuración',
    actionReason: 'No hay dónde guardar estos ajustes todavía.',
    preview: { kind: 'form', fields: ['Moneda', 'Impuestos', 'Datos fiscales', 'Plantilla de factura'] },
  },
  {
    id: 'integrations',
    label: 'Integraciones',
    icon: Plug,
    description: 'Conecta proveedores de pago y facturación: PayPal, Stripe, Mercado Pago y más.',
    live: false,
    emptyTitle: 'Integraciones',
    emptyText: 'Ningún proveedor está conectado.',
    actionLabel: 'Conectar',
    actionReason: NOT_YET,
    preview: { kind: 'form', fields: [] },
  },
];

export function tabById(id: string): BillingTab {
  return BILLING_TABS.find((t) => t.id === id) ?? BILLING_TABS[0];
}

export interface IntegrationInfo {
  id: 'paypal' | 'stripe' | 'mercadopago';
  name: string;
  initials: string;
  description: string;
  reason: string;
}

/** Proveedores previstos. Todos figuran «No conectado»: nunca se simula una conexión. */
export const INTEGRATIONS: readonly IntegrationInfo[] = [
  {
    id: 'paypal',
    name: 'PayPal',
    initials: 'PP',
    description: 'Procesa pagos y enlaces de cobro con PayPal.',
    reason: 'La conexión con PayPal aún no está desarrollada.',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    initials: 'St',
    description: 'Procesa tarjetas, suscripciones y facturación recurrente.',
    reason: 'La conexión con Stripe aún no está desarrollada.',
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    initials: 'MP',
    description: 'Cobra en Latinoamérica con Mercado Pago.',
    reason: 'La conexión con Mercado Pago aún no está desarrollada.',
  },
];
