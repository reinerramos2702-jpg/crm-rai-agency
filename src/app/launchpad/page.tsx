'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Megaphone,
  MessageCircle,
  ShoppingCart,
  UserPlus,
  Users,
  Filter,
  MessageSquare,
  Mail,
  CalendarCheck,
  Building2,
  Share2,
  Target,
  Inbox,
  Package,
  CreditCard,
  Link2,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Check,
  PlayCircle,
  ArrowRight,
  X,
  Zap,
  ShieldCheck,
  Bell,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  icon: any;
  title: string;
  description: string;
  href: string;
}

interface Category {
  id: string;
  label: string;
  icon: any;
  items: ChecklistItem[];
}

const CATEGORIES: Category[] = [
  {
    id: 'base',
    label: 'Configuración de base',
    icon: Settings,
    items: [
      {
        id: 'crear-contacto',
        icon: UserPlus,
        title: 'Crea tu primer contacto',
        description: 'Agrega tu primer contacto y empieza a construir tu base de clientes.',
        href: '/conversaciones',
      },
      {
        id: 'importar-contactos',
        icon: Users,
        title: 'Importa tus contactos existentes',
        description: 'Importa contactos desde otras plataformas para reunir toda tu audiencia en un solo lugar.',
        href: '/conversaciones',
      },
      {
        id: 'embudo-captacion',
        icon: Filter,
        title: 'Crea un embudo de captación',
        description: 'Configura un embudo y un formulario para captar clientes potenciales de forma automática.',
        href: '/marketing',
      },
      {
        id: 'comunicacion-multicanal',
        icon: MessageSquare,
        title: 'Activa la comunicación multicanal',
        description: 'Conecta correo, SMS y WhatsApp para responder a tus clientes desde un solo lugar.',
        href: '/conversaciones',
      },
      {
        id: 'primera-campana',
        icon: Mail,
        title: 'Lanza tu primera campaña',
        description: 'Diseña y envía tu primera campaña para impulsar la participación de tus contactos.',
        href: '/marketing',
      },
      {
        id: 'seguimiento-automatizado',
        icon: Target,
        title: 'Configura campañas de seguimiento automático',
        description: 'Automatiza secuencias de seguimiento para nutrir a tus clientes potenciales con el tiempo.',
        href: '/marketing',
      },
      {
        id: 'programacion-citas',
        icon: CalendarCheck,
        title: 'Activa la programación de citas',
        description: 'Configura tu calendario para recibir reservas automáticas con recordatorios.',
        href: '/marketing',
      },
      {
        id: 'pipeline-ventas',
        icon: Building2,
        title: 'Optimiza tu proceso de ventas',
        description: 'Organiza tu pipeline de ventas para hacer seguimiento del progreso de cada oportunidad.',
        href: '/conversaciones',
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing y generación de leads',
    icon: Megaphone,
    items: [
      {
        id: 'redes-sociales',
        icon: Share2,
        title: 'Gestiona tus redes sociales desde un solo lugar',
        description: 'Programa y administra publicaciones para Instagram, TikTok, Facebook y más.',
        href: '/marketing',
      },
      {
        id: 'anuncios-meta',
        icon: Share2,
        title: 'Captura leads con anuncios de Facebook e Instagram',
        description: 'Conecta tus canales de Meta Ads para gestionar campañas de generación de clientes potenciales.',
        href: '/marketing',
      },
      {
        id: 'campana-sms',
        icon: MessageSquare,
        title: 'Lanza tu primera campaña de SMS',
        description: 'Diseña y envía una campaña de SMS para llegar directamente a tu audiencia.',
        href: '/marketing',
      },
    ],
  },
  {
    id: 'ventas',
    label: 'Ventas y conversaciones',
    icon: MessageCircle,
    items: [
      {
        id: 'conversaciones-ventas',
        icon: Inbox,
        title: 'Gestiona tus conversaciones de ventas',
        description: 'Centraliza correo, SMS y WhatsApp para hacer seguimiento de cada conversación.',
        href: '/conversaciones',
      },
      {
        id: 'chat-en-vivo',
        icon: MessageCircle,
        title: 'Activa el chat en vivo en tu sitio web',
        description: 'Brinda asistencia instantánea a los visitantes de tu sitio en tiempo real.',
        href: '/conversaciones',
      },
      {
        id: 'messenger',
        icon: Share2,
        title: 'Conecta Facebook e Instagram Messenger',
        description: 'Gestiona todas tus conversaciones de redes sociales desde un solo lugar.',
        href: '/conversaciones',
      },
    ],
  },
  {
    id: 'ecommerce',
    label: 'Comercio electrónico',
    icon: ShoppingCart,
    items: [
      {
        id: 'lanzar-producto',
        icon: Package,
        title: 'Lanza tu primer producto',
        description: 'Configura y publica tu producto, servicio o suscripción para empezar a vender.',
        href: '/facturacion',
      },
      {
        id: 'conectar-pagos',
        icon: CreditCard,
        title: 'Conecta un proveedor de pagos',
        description: 'Vincula PayPal, Stripe o Mercado Pago para habilitar pagos rápidos y seguros.',
        href: '/facturacion',
      },
      {
        id: 'enlace-pago',
        icon: Link2,
        title: 'Crea un enlace de pago personalizado',
        description: 'Genera enlaces de pago para compartir con tus clientes y cobrar fácilmente.',
        href: '/facturacion',
      },
      {
        id: 'facturas',
        icon: FileText,
        title: 'Genera y envía facturas profesionales',
        description: 'Gestiona tu facturación enviando facturas personalizadas a tus clientes.',
        href: '/facturacion',
      },
    ],
  },
  {
    id: 'automatizacion',
    label: 'Automatización',
    icon: Zap,
    items: [
      {
        id: 'primera-automatizacion',
        icon: Zap,
        title: 'Activa tu primera automatización',
        description: 'Elige una de las 15 plantillas listas (mayoreo, retail o servicios) y actívala con un clic.',
        href: '/automatizacion',
      },
      {
        id: 'notificaciones-multicanal',
        icon: Bell,
        title: 'Configura notificaciones multicanal',
        description: 'Conecta tu webhook de n8n para que tus flujos avisen por WhatsApp, email o el canal que uses.',
        href: '/automatizacion',
      },
      {
        id: 'disparadores-eventos',
        icon: Target,
        title: 'Conecta disparadores de eventos del sistema',
        description: 'Activa flujos automáticos cuando entra un contacto, vence una cita o un cliente queda inactivo.',
        href: '/automatizacion',
      },
      {
        id: 'roles-equipo',
        icon: ShieldCheck,
        title: 'Define roles y permisos de tu equipo',
        description: 'Invita a tu equipo y asigna roles (Gerente, Agente, Viewer) desde Configuración.',
        href: '/settings',
      },
    ],
  },
];

interface TutorialManifestEntry {
  version: number;
  slides: number;
}

type TutorialManifest = Record<string, TutorialManifestEntry>;

export default function LaunchpadPage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [manualItemIds, setManualItemIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [manifest, setManifest] = useState<TutorialManifest>({});
  const [tutorialItem, setTutorialItem] = useState<ChecklistItem | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  // Progreso real por workspace (antes vivía solo en localStorage del
  // navegador, por eso siempre arrancaba en 0/22 · 0% sin importar la
  // actividad real). Ver src/app/api/launchpad/route.ts.
  const loadProgress = () => {
    fetch('/api/launchpad')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setCompleted(data.completed || []);
          setManualItemIds(data.manualItemIds || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    loadProgress();

    fetch('/tutorials/manifest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.items) setManifest(data.items as TutorialManifest);
      })
      .catch(() => {});
  }, []);

  const category = CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];

  const toggleComplete = (id: string) => {
    if (!manualItemIds.includes(id)) return; // ítem automático: no se puede marcar a mano
    const nextDone = !completed.includes(id);
    setCompleted((prev) => (nextDone ? [...prev, id] : prev.filter((x) => x !== id))); // optimista
    fetch('/api/launchpad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id, done: nextDone }),
    }).catch(() => loadProgress()); // si falla, recarga el estado real del servidor
  };

  const categoryProgress = (cat: Category) =>
    Math.round(
      (cat.items.filter((i) => completed.includes(i.id)).length / cat.items.length) * 100
    );

  const allItems = CATEGORIES.flatMap((c) => c.items);
  const overallProgress = Math.round(
    (allItems.filter((i) => completed.includes(i.id)).length / allItems.length) * 100
  );

  const openTutorial = (item: ChecklistItem) => {
    setTutorialItem(item);
    setSlideIndex(0);
  };

  const tutorialEntry = tutorialItem ? manifest[tutorialItem.id] : undefined;
  const slideCount = tutorialEntry?.slides ?? 0;

  return (
    <div className="container">
      <div className="row" style={{ gap: 10, alignItems: 'center', marginBottom: 4 }}>
        <Rocket size={20} color="var(--rai-gold)" />
        <h1 className="h1">Guía de Inicio</h1>
      </div>
      <p className="muted mb-4">
        Hola, aquí tienes tu lista de configuración personalizada con todo lo que necesitas para empezar.
      </p>

      <div className="card mb-6">
        <div className="row-between mb-2">
          <span className="muted" style={{ fontSize: 12 }}>Progreso general de la plataforma</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--rai-gold)' }}>
            {loaded ? `${completed.length} / ${allItems.length} pasos · ${overallProgress}%` : 'Calculando…'}
          </span>
        </div>
        <div className="lp-progress-track">
          <div className="lp-progress-fill" style={{ width: `${overallProgress}%` }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ width: 280, flexShrink: 0 }}>
          {CATEGORIES.map(({ id, label, icon: Icon, items }) => {
            const isActive = id === activeCategory;
            const pct = categoryProgress({ id, label, icon: Icon, items });
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveCategory(id);
                  setExpanded(null);
                }}
                className={isActive ? 'primary' : 'ghost'}
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  fontSize: 13,
                  textAlign: 'left',
                }}
              >
                <span className="row" style={{ gap: 8 }}>
                  <Icon size={14} />
                  {label}
                </span>
                <span
                  className="badge"
                  style={{
                    background: pct === 100 ? 'rgba(46,196,182,0.15)' : 'rgba(136,136,170,0.15)',
                    color: pct === 100 ? 'var(--rai-success)' : 'var(--rai-muted)',
                  }}
                >
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }}>
          <div className="card mb-4">
            <div className="row-between mb-2">
              <span className="muted" style={{ fontSize: 12 }}>
                Tu progreso de {category.label.toLowerCase()}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--rai-gold)' }}>
                {categoryProgress(category)}%
              </span>
            </div>
            <div className="lp-progress-track">
              <div className="lp-progress-fill" style={{ width: `${categoryProgress(category)}%` }} />
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {category.items.map((item, i) => {
              const isOpen = expanded === item.id;
              const isDone = completed.includes(item.id);
              const isManual = manualItemIds.includes(item.id);
              const Icon = item.icon;
              const tutorial = manifest[item.id];
              return (
                <div
                  key={item.id}
                  style={{
                    borderBottom:
                      i < category.items.length - 1 ? '1px solid var(--rai-border)' : 'none',
                    background: isDone ? 'rgba(46,196,182,0.04)' : 'transparent',
                  }}
                >
                  <div
                    className="row-between"
                    style={{ padding: '14px 16px', gap: 12 }}
                  >
                    <div
                      className="row"
                      style={{ gap: 12, alignItems: 'flex-start', flex: 1, cursor: 'pointer' }}
                      onClick={() => setExpanded(isOpen ? null : item.id)}
                    >
                      <div
                        role={isManual ? 'button' : undefined}
                        tabIndex={isManual ? 0 : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isManual) toggleComplete(item.id);
                        }}
                        onKeyDown={(e) => {
                          if (isManual && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleComplete(item.id);
                          }
                        }}
                        className="lp-ring"
                        aria-label={
                          isManual
                            ? isDone
                              ? 'Marcar como pendiente'
                              : 'Marcar como completado'
                            : 'Se completa automáticamente según tu actividad'
                        }
                        title={isManual ? undefined : 'Se completa automáticamente según tu actividad'}
                        style={{ marginTop: 1, cursor: isManual ? 'pointer' : 'default' }}
                      >
                        <svg width="32" height="32" viewBox="0 0 32 32">
                          <circle className="lp-ring-track" cx="16" cy="16" r="13" strokeWidth="3" />
                          <circle
                            className={`lp-ring-fill ${isDone ? 'done' : ''}`}
                            cx="16"
                            cy="16"
                            r="13"
                            strokeWidth="3"
                            strokeDasharray={2 * Math.PI * 13}
                            strokeDashoffset={2 * Math.PI * 13 * (1 - (isDone ? 1 : 0))}
                          />
                        </svg>
                        {isDone && <Check size={14} strokeWidth={3} className="lp-ring-check" />}
                      </div>
                      <Icon size={16} color="var(--rai-gold)" style={{ marginTop: 8, flexShrink: 0 }} />
                      <div style={{ marginTop: 4 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            textDecoration: isDone ? 'line-through' : 'none',
                            color: isDone ? 'var(--rai-muted)' : 'var(--rai-text)',
                          }}
                        >
                          {item.title}
                        </div>
                        <div className="muted mt-2" style={{ fontSize: 12, maxWidth: 560 }}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 10, flexShrink: 0, alignItems: 'center' }}>
                      <span className={`lp-ring-pct ${isDone ? 'done' : ''}`}>
                        {isDone ? 100 : 0}%
                      </span>
                      <button
                        onClick={() => setExpanded(isOpen ? null : item.id)}
                        className="ghost btn-sm"
                        style={{ padding: 6 }}
                      >
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '0 16px 16px 58px' }}>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <Link href={item.href} className="btn btn-secondary btn-sm">
                          Ir al módulo
                          <ArrowRight size={14} />
                        </Link>
                        <button onClick={() => openTutorial(item)} className="ghost btn-sm">
                          <PlayCircle size={14} />
                          Ver tutorial
                          {tutorial?.slides ? (
                            <span className="badge badge-gold" style={{ marginLeft: 4 }}>
                              {tutorial.slides}
                            </span>
                          ) : null}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {tutorialItem && (
        <div className="modal-backdrop" onClick={() => setTutorialItem(null)}>
          <div
            className="modal"
            style={{ maxWidth: 720 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between mb-4">
              <div>
                <h3>{tutorialItem.title}</h3>
                <p className="muted" style={{ fontSize: 12 }}>Tutorial paso a paso</p>
              </div>
              <button className="ghost btn-sm" onClick={() => setTutorialItem(null)}>
                <X size={16} />
              </button>
            </div>

            {slideCount > 0 ? (
              <>
                <div className="lp-slide-frame">
                  <img
                    src={`/tutorials/${tutorialItem.id}/slide-${slideIndex + 1}.svg`}
                    alt={`${tutorialItem.title} — paso ${slideIndex + 1}`}
                    style={{ width: '100%', borderRadius: 8, display: 'block' }}
                  />
                </div>
                <div className="row-between mt-4">
                  <button
                    className="ghost btn-sm"
                    disabled={slideIndex === 0}
                    onClick={() => setSlideIndex((s) => Math.max(0, s - 1))}
                  >
                    <ChevronLeft size={14} />
                    Anterior
                  </button>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Paso {slideIndex + 1} de {slideCount}
                  </span>
                  <button
                    className="ghost btn-sm"
                    disabled={slideIndex >= slideCount - 1}
                    onClick={() => setSlideIndex((s) => Math.min(slideCount - 1, s + 1))}
                  >
                    Siguiente
                    <ChevronRight size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="lp-slide-frame lp-slide-empty">
                <PlayCircle size={32} color="var(--rai-muted)" />
                <p className="muted mt-2" style={{ fontSize: 13, textAlign: 'center' }}>
                  El tutorial de este paso está en preparación.
                  <br />
                  Pronto encontrarás aquí una guía visual.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
