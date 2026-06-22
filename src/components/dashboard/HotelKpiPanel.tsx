'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BedDouble, LogIn, LogOut, Wallet, Clock, AlertCircle, TrendingUp,
  Users, MessageSquare, ChevronRight, Building2, RefreshCw,
} from 'lucide-react';
import { formatMoney, BookingStatusBadge, PaymentStatusBadge } from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';

interface Kpis {
  arrivalsToday: number;
  departuresToday: number;
  currentlyStaying: number;
  pendingBookings: number;
  overduePayments: number;
  monthRevenueCents: number;
  pendingPaymentsCents: number;
  totalGuests: number;
  totalSites: number;
  totalRooms: number;
  occupiedRooms: number;
  occupancyPct: number;
  unreadConversations: number;
}

interface Recent {
  bookings: Array<{
    id: string; reference: string; status: string;
    checkInDate: string; checkOutDate: string;
    guest: { firstName: string; lastName: string | null };
    site: { name: string };
  }>;
  payments: Array<{
    id: string; reference: string; status: string;
    amountCents: number; currency: string; createdAt: string;
    guest: { firstName: string; lastName: string | null } | null;
  }>;
}

const CACHE_KEY = 'rai_hotel_kpis_v1';

export function HotelKpiPanel() {
  const [kpis, setKpis] = useState<Kpis | null>(() => {
    if (typeof window === 'undefined') return null;
    try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw).kpis : null; } catch { return null; }
  });
  const [recent, setRecent] = useState<Recent | null>(() => {
    if (typeof window === 'undefined') return null;
    try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw).recent : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(kpis === null);

  async function load() {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch('/api/hotel-kpis', { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setKpis(data.kpis);
      setRecent(data.recent);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
    } catch {
      // silencioso: el panel es complementario
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // Si nunca ha cargado y no hay cache, mostrar empty con CTA
  if (!loading && kpis && kpis.totalGuests === 0 && kpis.totalSites === 0) {
    return (
      <div className="card mb-4" style={{ padding: 24 }}>
        <div className="row" style={{ gap: 12, alignItems: 'center', marginBottom: 8 }}>
          <Building2 size={20} color="var(--rai-gold)" />
          <h2 style={{ margin: 0, fontSize: 16 }}>Capa hotelera lista para usar</h2>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Empieza creando tu primer sitio y agrega habitaciones. Después podrás registrar huéspedes, reservas y pagos.
        </p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Link href="/sitios" className="primary" style={{ textDecoration: 'none' }}><Building2 size={14} /> Crear sitio</Link>
          <Link href="/pasajeros" className="secondary" style={{ textDecoration: 'none' }}><Users size={14} /> Crear huésped</Link>
          <Link href="/reservas" className="secondary" style={{ textDecoration: 'none' }}><BedDouble size={14} /> Crear reserva</Link>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="card mb-4" style={{ padding: 16 }}>
        <div className="muted" style={{ fontSize: 13 }}>Cargando KPIs del hotel…</div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="row-between mb-4">
        <h2 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={16} color="var(--rai-gold)" />
          Operación del hotel
          <HelpTip content="Vista ejecutiva del estado operativo: llegadas/salidas del día, ocupación, ingresos del mes y alertas urgentes." />
        </h2>
        <button className="ghost btn-sm" onClick={load} title="Actualizar">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* KPI grid principal */}
      <div className="grid-4" style={{ gap: 12, marginBottom: 12 }}>
        <Kpi
          icon={LogIn} color="#2EC4B6"
          label="Llegadas hoy" value={kpis.arrivalsToday}
          href="/reservas?status=confirmed"
          hint="Reservas confirmadas con fecha de check-in hoy."
        />
        <Kpi
          icon={LogOut} color="#7B5EA7"
          label="Salidas hoy" value={kpis.departuresToday}
          href="/reservas?status=checked_in"
          hint="Huéspedes con check-out programado hoy."
        />
        <Kpi
          icon={BedDouble} color="#C9A84C"
          label="Hospedados ahora" value={kpis.currentlyStaying}
          href="/reservas?status=checked_in"
          hint="Reservas con check-in completado y aún sin check-out."
        />
        <Kpi
          icon={TrendingUp} color="#2EC4B6"
          label="Ingresos del mes" value={formatMoney(kpis.monthRevenueCents)}
          href="/pagos?status=paid"
          hint="Suma de pagos aprobados con fecha de cobro dentro del mes actual."
          isMoney
        />
      </div>

      {/* Alertas / acción */}
      {(kpis.overduePayments > 0 || kpis.pendingBookings > 0 || kpis.unreadConversations > 0) && (
        <div className="card mb-4" style={{ padding: 14, borderLeft: '3px solid var(--rai-warning)' }}>
          <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <AlertCircle size={14} color="var(--rai-warning)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Atención requerida</span>
          </div>
          <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
            {kpis.pendingBookings > 0 && (
              <Link href="/reservas?status=pending" style={{ color: 'var(--rai-text)', textDecoration: 'none', fontSize: 12 }}>
                <strong style={{ color: 'var(--rai-warning)' }}>{kpis.pendingBookings}</strong> reservas pendientes confirmar →
              </Link>
            )}
            {kpis.overduePayments > 0 && (
              <Link href="/pagos?status=pending" style={{ color: 'var(--rai-text)', textDecoration: 'none', fontSize: 12 }}>
                <strong style={{ color: 'var(--rai-error)' }}>{kpis.overduePayments}</strong> pagos vencidos (+7 días) →
              </Link>
            )}
            {kpis.unreadConversations > 0 && (
              <Link href="/conversaciones" style={{ color: 'var(--rai-text)', textDecoration: 'none', fontSize: 12 }}>
                <strong style={{ color: 'var(--rai-purple)' }}>{kpis.unreadConversations}</strong> mensajes sin leer →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* KPI secundarios */}
      <div className="grid-4" style={{ gap: 12, marginBottom: 12 }}>
        <KpiSmall icon={Users} label="Huéspedes" value={kpis.totalGuests} href="/pasajeros" />
        <KpiSmall icon={Building2} label="Sitios activos" value={kpis.totalSites} href="/sitios" />
        <KpiSmall icon={BedDouble} label="Ocupación" value={`${kpis.occupancyPct}%`} sub={`${kpis.occupiedRooms}/${kpis.totalRooms}`} href="/sitios" hint="Habitaciones ocupadas sobre el total de habitaciones del workspace." />
        <KpiSmall icon={Wallet} label="Por cobrar" value={formatMoney(kpis.pendingPaymentsCents)} href="/pagos?status=pending" />
      </div>

      {/* Listas recientes */}
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <div className="row" style={{ gap: 6 }}>
              <BedDouble size={13} color="var(--rai-gold)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Reservas recientes</span>
            </div>
            <Link href="/reservas" className="ghost btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}>
              Ver todas <ChevronRight size={10} />
            </Link>
          </div>
          {!recent || recent.bookings.length === 0 ? (
            <div className="muted" style={{ fontSize: 12, padding: 8, textAlign: 'center' }}>Sin reservas aún</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent.bookings.map((b) => (
                <li key={b.id} className="row-between" style={{ padding: '6px 8px', borderRadius: 4, background: 'rgba(201,168,76,0.03)' }}>
                  <Link href={`/reservas/${b.id}`} style={{ color: 'var(--rai-text)', textDecoration: 'none', fontSize: 12 }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--rai-gold)' }}>{b.reference}</span>
                    {' · '}{b.guest.firstName} {b.guest.lastName ?? ''}
                  </Link>
                  <BookingStatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <div className="row" style={{ gap: 6 }}>
              <Wallet size={13} color="var(--rai-gold)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Pagos recientes</span>
            </div>
            <Link href="/pagos" className="ghost btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}>
              Ver todos <ChevronRight size={10} />
            </Link>
          </div>
          {!recent || recent.payments.length === 0 ? (
            <div className="muted" style={{ fontSize: 12, padding: 8, textAlign: 'center' }}>Sin pagos aún</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent.payments.map((p) => (
                <li key={p.id} className="row-between" style={{ padding: '6px 8px', borderRadius: 4, background: 'rgba(201,168,76,0.03)' }}>
                  <Link href={`/pagos/${p.id}`} style={{ color: 'var(--rai-text)', textDecoration: 'none', fontSize: 12 }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--rai-gold)' }}>{p.reference}</span>
                    {p.guest && <> · {p.guest.firstName} {p.guest.lastName ?? ''}</>}
                  </Link>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{formatMoney(p.amountCents, p.currency)}</span>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon, color, label, value, href, hint, isMoney,
}: { icon: typeof BedDouble; color: string; label: string; value: React.ReactNode; href: string; hint: string; isMoney?: boolean }) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        padding: 16, textDecoration: 'none', color: 'inherit',
        display: 'flex', flexDirection: 'column', gap: 8,
        position: 'relative', overflow: 'hidden',
        transition: 'transform 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.6 }} />
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `${color}20`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} />
        </div>
        <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>{label}</div>
        <HelpTip content={hint} size={11} />
      </div>
      <div style={{ fontSize: isMoney ? 18 : 24, fontWeight: 700, color: 'var(--rai-text)' }}>{value}</div>
    </Link>
  );
}

function KpiSmall({
  icon: Icon, label, value, sub, href, hint,
}: { icon: typeof Users; label: string; value: React.ReactNode; sub?: string; href: string; hint?: string }) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        padding: 12, textDecoration: 'none', color: 'inherit',
        display: 'flex', flexDirection: 'column', gap: 4,
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.05)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
    >
      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
        <Icon size={12} color="var(--rai-muted)" />
        <span className="muted" style={{ fontSize: 11 }}>{label}</span>
        {hint && <HelpTip content={hint} size={10} />}
      </div>
      <div className="row" style={{ gap: 6, alignItems: 'baseline' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--rai-text)' }}>{value}</span>
        {sub && <span className="muted" style={{ fontSize: 11 }}>{sub}</span>}
      </div>
    </Link>
  );
}
