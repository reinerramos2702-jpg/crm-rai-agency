'use client';

import React, { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Wifi, WifiOff, ShieldCheck, Menu, X, ChevronLeft, Search, PanelLeftClose, Rows3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { hasModuleAccess, ROLE_LABELS, type Role } from '@/lib/roles-shared';
import { apiFetch } from '@/lib/client-api';
import { prefetchRouteData, warmCommonData } from '@/lib/route-data';
import { NAV_GROUPS, NAV_ITEMS, findNavItem } from './nav-config';
import { CommandPalette, type PaletteItem } from './CommandPalette';
import { DensityToggle, applyDensity, readDensity } from '@/components/ui/DensityToggle';
import { DENSITY_LABELS, nextDensity } from '@/lib/density';

interface SidebarProps {
  n8nConnected?: boolean;
}

/** Preferencia persistida del menú lateral (solo escritorio). */
const COLLAPSE_KEY = 'rai-sidebar-collapsed-v1';
const RECENT_KEY = 'rai-cmd-recent-v1';
/** Evento para abrir/cerrar el menú desde otros componentes (p. ej. la guía). */
export const SIDEBAR_EVENT = 'rai:sidebar';

const cv = (vars: Record<string, string | number>) => vars as CSSProperties;

/**
 * Sidebar lateral premium con logo RAI, navegación y estado de n8n.
 */
export function Sidebar({ n8nConnected }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);
  const waveTimer = useRef<number | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [mac, setMac] = useState(false);

  // El atributo lo fija un script en <head> (sin parpadeo); aquí solo se sincroniza el estado.
  const applyCollapsed = useCallback((value: boolean) => {
    const root = document.documentElement;
    if (value) root.setAttribute('data-sidebar', 'collapsed');
    else root.removeAttribute('data-sidebar');
    try {
      if (value) window.localStorage.setItem(COLLAPSE_KEY, '1');
      else window.localStorage.removeItem(COLLAPSE_KEY);
    } catch {
      /* sin almacenamiento: la preferencia solo dura la sesión */
    }
    setCollapsed(value);
    setTip(null);
    // Onda de iconos y destello del borde: solo dura lo que la animación.
    root.classList.add('sb-wave');
    if (waveTimer.current) window.clearTimeout(waveTimer.current);
    waveTimer.current = window.setTimeout(() => root.classList.remove('sb-wave'), 1100);
  }, []);

  // Precarga en reposo: los módulos más usados quedan listos antes del primer clic.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warmCommonData);
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(warmCommonData, 1500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    setCollapsed(document.documentElement.getAttribute('data-sidebar') === 'collapsed');
    // Activa las transiciones solo después de la primera pintura.
    const id = window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => document.documentElement.classList.add('sb-anim')),
    );
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'b') return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      applyCollapsed(document.documentElement.getAttribute('data-sidebar') !== 'collapsed');
    };
    const onEvent = (e: Event) => {
      const mode = (e as CustomEvent<string>).detail;
      applyCollapsed(mode === 'close');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(SIDEBAR_EVENT, onEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(SIDEBAR_EVENT, onEvent);
    };
  }, [applyCollapsed]);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.role) setRole(data.role as Role);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    try {
      const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
      if (Array.isArray(raw)) setRecentIds(raw.filter((x): x is string => typeof x === 'string').slice(0, 6));
    } catch {
      /* sin recientes */
    }
  }, []);

  const pushRecent = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 6);
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* la lista solo dura la sesión */
      }
      return next;
    });
  }, []);

  // Cada módulo visitado alimenta «Recientes» de la paleta.
  useEffect(() => {
    const item = findNavItem(pathname);
    if (item) pushRecent(`nav:${item.href}`);
  }, [pathname, pushRecent]);

  // Al cambiar de módulo, el ítem activo debe quedar a la vista dentro del menú.
  useEffect(() => {
    const aside = asideRef.current;
    const link = aside?.querySelector<HTMLElement>('.sb-link.nav-active');
    if (!aside || !link) return;
    const a = aside.getBoundingClientRect();
    const l = link.getBoundingClientRect();
    if (l.top < a.top + 90 || l.bottom > a.bottom - 20) {
      aside.scrollTo({ top: aside.scrollTop + (l.top - a.top) - aside.clientHeight / 2 + l.height / 2, behavior: 'smooth' });
    }
  }, [pathname, role]);

  const showTip = (label: string, el: HTMLElement) => {
    if (document.documentElement.getAttribute('data-sidebar') !== 'collapsed') return;
    const r = el.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2 });
  };

  // Cicla Compacta → Estándar → Espaciosa; el selector del pie se sincroniza por evento.
  const cycleDensity = () => {
    const next = nextDensity(readDensity());
    applyDensity(next);
    toast(`Densidad de la interfaz: ${DENSITY_LABELS[next]}`);
  };

  const canSee = (href: string) => !role || hasModuleAccess(role, href);
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canSee(i.href)) })).filter((g) => g.items.length > 0);
  const visibleCount = groups.reduce((n, g) => n + g.items.length, 0);

  const paletteItems: PaletteItem[] = [
    ...NAV_ITEMS.filter((i) => canSee(i.href)).map((i) => ({
      id: `nav:${i.href}`,
      label: i.label,
      group: NAV_GROUPS.find((g) => g.items.includes(i))?.label ?? 'Módulos',
      icon: i.icon,
      href: i.href,
      keywords: i.keywords,
    })),
    {
      id: 'act:sidebar',
      label: collapsed ? 'Expandir menú lateral' : 'Reducir menú lateral a iconos',
      group: 'Acciones',
      icon: PanelLeftClose,
      keywords: 'ocultar mostrar barra lateral sidebar',
      run: () => applyCollapsed(!collapsed),
    },
    {
      id: 'act:density',
      label: 'Cambiar densidad de la interfaz',
      group: 'Acciones',
      icon: Rows3,
      keywords: 'compacta estándar espaciosa espaciado tamaño filas tablas',
      run: cycleDensity,
    },
  ];

  const selectPaletteItem = (item: PaletteItem) => {
    setPaletteOpen(false);
    if (item.href) {
      pushRecent(item.id);
      router.push(item.href);
    } else item.run?.();
  };

  return (
    <>
      {/* Mobile header bar */}
      <div className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menú"
          style={{ border: 'none', boxShadow: 'none' }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image
            src="/crystal-logo.webp"
            alt="RAI"
            width={28}
            height={28}
            sizes="28px"
            style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(123,94,167,0.4))' }}
          />
          <span className="gradient-text" style={{ fontSize: 16, fontWeight: 800 }}>RAI</span>
        </div>
        <div style={{ width: 22 }} />
      </div>

      {/* Mobile overlay */}
      <div
        className={`mobile-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Botón flotante en el borde del menú: lo reduce a iconos y lo vuelve a expandir (solo escritorio) */}
      <button
        type="button"
        className="sb-toggle"
        aria-label={collapsed ? 'Expandir menú lateral' : 'Reducir menú lateral'}
        aria-expanded={!collapsed}
        title={collapsed ? 'Expandir menú (Ctrl+B)' : 'Reducir menú (Ctrl+B)'}
        data-tour="sidebar-toggle"
        onClick={() => applyCollapsed(!collapsed)}
      >
        <ChevronLeft size={15} strokeWidth={2.6} />
      </button>
      <span className="sb-sweep" aria-hidden="true" />

      <aside ref={asideRef} className={`app-sidebar ${mobileOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div
        className="sb-brand"
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--rai-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image
            src="/crystal-logo.webp"
            alt="RAI Agency"
            width={40}
            height={40}
            sizes="40px"
            style={{
              width: 40,
              height: 40,
              borderRadius: 0,
              objectFit: 'contain',
              flexShrink: 0,
              filter: 'drop-shadow(0 0 8px rgba(123, 94, 167, 0.4))',
            }}
          />
          <div className="sb-label sb-brandtext">
            <div
              className="gradient-text"
              style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              RAI
            </div>
            <div style={{ fontSize: 10, color: 'var(--rai-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Agency CRM
            </div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      {/* Búsqueda rápida (abre la paleta de comandos) */}
      <div className="sb-searchwrap" style={cv({ '--i': 0 })}>
        <button
          type="button"
          className="sb-search"
          onClick={() => setPaletteOpen(true)}
          aria-label="Buscar (paleta de comandos)"
          aria-keyshortcuts="Control+K Meta+K"
          title={`Buscar (${mac ? '⌘K' : 'Ctrl+K'})`}
          onMouseEnter={(e) => showTip('Buscar', e.currentTarget)}
          onMouseLeave={() => setTip(null)}
          data-tour="sidebar-search"
        >
          <Search size={18} className="sb-ic" />
          <span className="sb-label">Buscar…</span>
          <kbd className="sb-label sb-kbd">{mac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
      </div>

      {/* Navegación agrupada por tarea */}
      <nav style={{ flex: 1, padding: '4px 8px 12px' }} aria-label="Navegación principal">
        {(() => {
          let idx = 0;
          return groups.map((group, gi) => (
            <div key={group.id} role="group" aria-label={group.label} className="sb-group">
              <div className="sb-section" style={cv({ '--i': idx + 1 })} data-first={gi === 0 || undefined}>
                <span className="sb-label">{group.label}</span>
              </div>
              {group.items.map(({ href, label, icon: Icon }) => {
                idx += 1;
                const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                    onMouseEnter={(e) => {
                      showTip(label, e.currentTarget);
                      prefetchRouteData(href);
                    }}
                    onFocus={(e) => {
                      showTip(label, e.currentTarget);
                      prefetchRouteData(href);
                    }}
                    onTouchStart={() => prefetchRouteData(href)}
                    onMouseLeave={() => setTip(null)}
                    onBlur={() => setTip(null)}
                    style={{
                      ...cv({ '--i': idx }),
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: 8,
                      marginBottom: 2,
                      color: isActive ? 'var(--rai-gold)' : 'var(--rai-muted)',
                      background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                      border: isActive ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 400,
                      textDecoration: 'none',
                    }}
                    className={`sb-link ${isActive ? 'nav-active' : 'nav-item'}`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="sb-ic" />
                    <span className="sb-label">{label}</span>
                  </Link>
                );
              })}
            </div>
          ));
        })()}
      </nav>

      {/* Estado n8n */}
      <div
        className="sb-foot"
        style={{
          ...cv({ '--i': visibleCount + 2 }),
          padding: '16px 20px',
          borderTop: '1px solid var(--rai-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--rai-muted)',
          }}
        >
          {n8nConnected ? (
            <>
              <Wifi size={14} color="var(--rai-success)" />
              <span className="sb-label" style={{ color: 'var(--rai-success)' }}>n8n conectado</span>
            </>
          ) : (
            <>
              <WifiOff size={14} />
              <span className="sb-label">n8n no configurado</span>
            </>
          )}
        </div>
        {role && (
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              fontSize: 11,
              color: 'var(--rai-muted)',
            }}
          >
            <ShieldCheck size={14} color="var(--rai-gold)" />
            <span className="sb-label">Rol: {ROLE_LABELS[role]}</span>
          </div>
        )}
        <div className="sb-density">
          <DensityToggle />
        </div>
        <div className="sb-label sb-copy" style={{ marginTop: 8, fontSize: 11, color: 'var(--rai-muted)', opacity: 0.6 }}>
          RAI Agency © 2025
        </div>
      </div>
    </aside>
      <CommandPalette
        open={paletteOpen}
        items={paletteItems}
        recentIds={recentIds}
        onClose={() => setPaletteOpen(false)}
        onSelect={selectPaletteItem}
      />
      {collapsed && tip && (
        <div key={tip.label} className="sb-tip" role="tooltip" style={{ top: tip.top }}>
          {tip.label}
        </div>
      )}
    </>
  );
}
