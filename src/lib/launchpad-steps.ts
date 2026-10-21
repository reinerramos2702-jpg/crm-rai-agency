// Datos puros (sin React ni iconos) de los pasos de la Guía de Inicio.
// Fuente única: la usan /launchpad (que añade los iconos) y el Dashboard
// («Siguiente mejor acción»). Los ids deben coincidir con
// src/lib/launchpad-items.ts y con src/app/api/launchpad/route.ts.

import { computeNextStep } from './launchpad-progress';
import { isManualLaunchpadItemId } from './launchpad-items';

export interface LaunchpadStep {
  id: string;
  title: string;
  description: string;
  /** Módulo donde se hace el paso (enlace profundo). */
  href: string;
  /** Tiempo estimado en minutos. */
  minutes: number;
  /** Solo en pasos automáticos: qué acción real lo completa. */
  autoHow: string | null;
}

export interface LaunchpadCategoryData {
  id: string;
  label: string;
  items: LaunchpadStep[];
}

export const LAUNCHPAD_CATEGORIES: LaunchpadCategoryData[] = [
  {
    id: 'base',
    label: 'Configuración de base',
    items: [
      {
        id: 'crear-contacto',
        title: 'Crea tu primer contacto',
        description: 'Agrega tu primer contacto y empieza a construir tu base de clientes.',
        href: '/contactos',
        minutes: 2,
        autoHow: 'Se completa al registrar tu primer contacto.',
      },
      {
        id: 'importar-contactos',
        title: 'Importa tus contactos existentes',
        description: 'Importa contactos desde otras plataformas para reunir toda tu audiencia en un solo lugar.',
        href: '/contactos',
        minutes: 10,
        autoHow: 'Se completa cuando tienes dos o más contactos.',
      },
      {
        id: 'embudo-captacion',
        title: 'Crea un embudo de captación',
        description: 'Configura un embudo y un formulario para captar clientes potenciales de forma automática.',
        href: '/marketing',
        minutes: 15,
        autoHow: null,
      },
      {
        id: 'comunicacion-multicanal',
        title: 'Activa la comunicación multicanal',
        description: 'Conecta correo, SMS y WhatsApp para responder a tus clientes desde un solo lugar.',
        href: '/conversaciones',
        minutes: 10,
        autoHow: 'Se completa cuando llega o creas una conversación por un canal distinto al manual.',
      },
      {
        id: 'primera-campana',
        title: 'Lanza tu primera campaña',
        description: 'Diseña y envía tu primera campaña para impulsar la participación de tus contactos.',
        href: '/campaign/new',
        minutes: 8,
        autoHow: 'Se completa al crear tu primera campaña.',
      },
      {
        id: 'seguimiento-automatizado',
        title: 'Configura campañas de seguimiento automático',
        description: 'Automatiza secuencias de seguimiento para nutrir a tus clientes potenciales con el tiempo.',
        href: '/automatizacion',
        minutes: 10,
        autoHow: 'Se completa al activar un flujo de automatización.',
      },
      {
        id: 'programacion-citas',
        title: 'Activa la programación de citas',
        description: 'Configura tu calendario para recibir reservas automáticas con recordatorios.',
        href: '/calendarios',
        minutes: 8,
        autoHow: 'Se completa al habilitar reservas en un calendario o al registrar una cita.',
      },
      {
        id: 'pipeline-ventas',
        title: 'Optimiza tu proceso de ventas',
        description: 'Organiza tu pipeline de ventas para hacer seguimiento del progreso de cada oportunidad.',
        href: '/clientes-potenciales',
        minutes: 10,
        autoHow: null,
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing y generación de leads',
    items: [
      {
        id: 'redes-sociales',
        title: 'Gestiona tus redes sociales desde un solo lugar',
        description: 'Programa y administra publicaciones para Instagram, TikTok, Facebook y más.',
        href: '/automatizacion',
        minutes: 10,
        autoHow: null,
      },
      {
        id: 'anuncios-meta',
        title: 'Captura leads con anuncios de Facebook e Instagram',
        description: 'Conecta tus canales de Meta Ads para gestionar campañas de generación de clientes potenciales.',
        href: '/marketing',
        minutes: 15,
        autoHow: null,
      },
      {
        id: 'campana-sms',
        title: 'Lanza tu primera campaña de SMS',
        description: 'Diseña y envía una campaña de SMS para llegar directamente a tu audiencia.',
        href: '/marketing',
        minutes: 10,
        autoHow: null,
      },
    ],
  },
  {
    id: 'ventas',
    label: 'Ventas y conversaciones',
    items: [
      {
        id: 'conversaciones-ventas',
        title: 'Gestiona tus conversaciones de ventas',
        description: 'Centraliza correo, SMS y WhatsApp para hacer seguimiento de cada conversación.',
        href: '/conversaciones',
        minutes: 5,
        autoHow: 'Se completa cuando existe tu primera conversación.',
      },
      {
        id: 'chat-en-vivo',
        title: 'Activa el chat en vivo en tu sitio web',
        description: 'Brinda asistencia instantánea a los visitantes de tu sitio en tiempo real.',
        href: '/conversaciones',
        minutes: 10,
        autoHow: null,
      },
      {
        id: 'messenger',
        title: 'Conecta Facebook e Instagram Messenger',
        description: 'Gestiona todas tus conversaciones de redes sociales desde un solo lugar.',
        href: '/conversaciones',
        minutes: 10,
        autoHow: 'Se completa cuando recibes tu primera conversación de Instagram.',
      },
    ],
  },
  {
    id: 'ecommerce',
    label: 'Comercio electrónico',
    items: [
      {
        id: 'lanzar-producto',
        title: 'Lanza tu primer producto',
        description: 'Configura y publica tu producto, servicio o suscripción para empezar a vender.',
        href: '/facturacion',
        minutes: 15,
        autoHow: null,
      },
      {
        id: 'conectar-pagos',
        title: 'Conecta un proveedor de pagos',
        description: 'Vincula PayPal, Stripe o Mercado Pago para habilitar pagos rápidos y seguros.',
        href: '/facturacion',
        minutes: 12,
        autoHow: null,
      },
      {
        id: 'enlace-pago',
        title: 'Crea un enlace de pago personalizado',
        description: 'Genera enlaces de pago para compartir con tus clientes y cobrar fácilmente.',
        href: '/facturacion',
        minutes: 5,
        autoHow: null,
      },
      {
        id: 'facturas',
        title: 'Genera y envía facturas profesionales',
        description: 'Gestiona tu facturación enviando facturas personalizadas a tus clientes.',
        href: '/pagos',
        minutes: 8,
        autoHow: 'Se completa al registrar tu primer pago.',
      },
    ],
  },
  {
    id: 'automatizacion',
    label: 'Automatización',
    items: [
      {
        id: 'primera-automatizacion',
        title: 'Activa tu primera automatización',
        description: 'Elige una de las 15 plantillas listas (mayoreo, retail o servicios) y actívala con un clic.',
        href: '/automatizacion',
        minutes: 3,
        autoHow: 'Se completa al crear tu primer flujo.',
      },
      {
        id: 'notificaciones-multicanal',
        title: 'Configura notificaciones multicanal',
        description: 'Conecta tu webhook de n8n para que tus flujos avisen por WhatsApp, email o el canal que uses.',
        href: '/automatizacion',
        minutes: 8,
        autoHow: 'Se completa al guardar la dirección del webhook de n8n.',
      },
      {
        id: 'disparadores-eventos',
        title: 'Conecta disparadores de eventos del sistema',
        description: 'Activa flujos automáticos cuando entra un contacto, vence una cita o un cliente queda inactivo.',
        href: '/automatizacion',
        minutes: 8,
        autoHow: 'Se completa al activar un flujo que arranca con un evento (contacto nuevo, etiqueta o cita).',
      },
      {
        id: 'roles-equipo',
        title: 'Define roles y permisos de tu equipo',
        description: 'Invita a tu equipo y asigna roles (Gerente, Agente, Viewer) desde Configuración.',
        href: '/settings',
        minutes: 5,
        autoHow: 'Se completa al invitar a tu primer miembro.',
      },
    ],
  },
];

export const LAUNCHPAD_STEPS: LaunchpadStep[] = LAUNCHPAD_CATEGORIES.flatMap((c) => c.items);

export const LAUNCHPAD_TOTAL = LAUNCHPAD_STEPS.length;

/** ¿El paso se marca a mano? (el resto se completa solo según la actividad). */
export function isManualStep(id: string): boolean {
  return isManualLaunchpadItemId(id);
}

/** Minutos que faltan para terminar los pasos pendientes (los pospuestos cuentan: siguen pendientes). */
export function remainingMinutes(completed: readonly string[]): number {
  const done = new Set(completed);
  return LAUNCHPAD_STEPS.filter((s) => !done.has(s.id)).reduce((acc, s) => acc + s.minutes, 0);
}

export interface NextAction {
  step: LaunchpadStep;
  category: LaunchpadCategoryData;
  /** true si solo quedan pasos pospuestos y se sugiere retomar uno. */
  fromSkipped: boolean;
}

/**
 * «Siguiente mejor acción»: primer paso pendiente que no esté pospuesto. Si todo lo
 * pendiente está pospuesto, sugiere retomar el primero. undefined si todo está completo.
 */
export function nextBestAction(completed: readonly string[], skipped: readonly string[] = []): NextAction | undefined {
  const preferred = computeNextStep(LAUNCHPAD_CATEGORIES, [...completed, ...skipped]);
  if (preferred) return { step: preferred.item, category: preferred.category, fromSkipped: false };
  const fallback = computeNextStep(LAUNCHPAD_CATEGORIES, completed);
  if (fallback) return { step: fallback.item, category: fallback.category, fromSkipped: true };
  return undefined;
}
