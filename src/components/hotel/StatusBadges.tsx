'use client';

import React from 'react';
import {
  CheckCircle2, Clock, XCircle, AlertTriangle, Ban,
  CreditCard, RefreshCw, Eye, LogIn, LogOut, UserCheck,
  Star, UserX, BedDouble, Sparkles,
} from 'lucide-react';

type BadgeProps = { label?: string; size?: 'sm' | 'md' };

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  border: '1px solid',
  whiteSpace: 'nowrap',
};

function Badge({
  icon: Icon, color, bg, border, label, size = 'sm',
}: BadgeProps & { icon: typeof CheckCircle2; color: string; bg: string; border: string }) {
  const fs = size === 'md' ? 12 : 11;
  return (
    <span style={{ ...baseStyle, color, background: bg, borderColor: border, fontSize: fs }}>
      <Icon size={fs} />
      {label}
    </span>
  );
}

// ============================================
// PAYMENT STATUS
// ============================================
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  under_review: 'En revisión',
};

export function PaymentStatusBadge({ status, size }: { status: string; size?: 'sm' | 'md' }) {
  const label = PAYMENT_STATUS_LABELS[status] ?? status;
  switch (status) {
    case 'paid':
      return <Badge icon={CheckCircle2} color="#2EC4B6" bg="rgba(46,196,182,0.12)" border="rgba(46,196,182,0.3)" label={label} size={size} />;
    case 'pending':
      return <Badge icon={Clock} color="#FF9F1C" bg="rgba(255,159,28,0.12)" border="rgba(255,159,28,0.3)" label={label} size={size} />;
    case 'failed':
      return <Badge icon={XCircle} color="#E63946" bg="rgba(230,57,70,0.12)" border="rgba(230,57,70,0.3)" label={label} size={size} />;
    case 'cancelled':
      return <Badge icon={Ban} color="#8888AA" bg="rgba(136,136,170,0.12)" border="rgba(136,136,170,0.3)" label={label} size={size} />;
    case 'refunded':
      return <Badge icon={RefreshCw} color="#7B5EA7" bg="rgba(123,94,167,0.12)" border="rgba(123,94,167,0.3)" label={label} size={size} />;
    case 'under_review':
      return <Badge icon={Eye} color="#C9A84C" bg="rgba(201,168,76,0.12)" border="rgba(201,168,76,0.3)" label={label} size={size} />;
    default:
      return <Badge icon={AlertTriangle} color="#8888AA" bg="rgba(136,136,170,0.12)" border="rgba(136,136,170,0.3)" label={label} size={size} />;
  }
}

// ============================================
// BOOKING STATUS
// ============================================
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  checked_in: 'Check-in',
  checked_out: 'Check-out',
  cancelled: 'Cancelada',
  no_show: 'No-show',
};

export function BookingStatusBadge({ status, size }: { status: string; size?: 'sm' | 'md' }) {
  const label = BOOKING_STATUS_LABELS[status] ?? status;
  switch (status) {
    case 'confirmed':
      return <Badge icon={CheckCircle2} color="#2EC4B6" bg="rgba(46,196,182,0.12)" border="rgba(46,196,182,0.3)" label={label} size={size} />;
    case 'pending':
      return <Badge icon={Clock} color="#FF9F1C" bg="rgba(255,159,28,0.12)" border="rgba(255,159,28,0.3)" label={label} size={size} />;
    case 'checked_in':
      return <Badge icon={LogIn} color="#C9A84C" bg="rgba(201,168,76,0.12)" border="rgba(201,168,76,0.3)" label={label} size={size} />;
    case 'checked_out':
      return <Badge icon={LogOut} color="#8888AA" bg="rgba(136,136,170,0.12)" border="rgba(136,136,170,0.3)" label={label} size={size} />;
    case 'cancelled':
      return <Badge icon={Ban} color="#E63946" bg="rgba(230,57,70,0.12)" border="rgba(230,57,70,0.3)" label={label} size={size} />;
    case 'no_show':
      return <Badge icon={UserX} color="#E63946" bg="rgba(230,57,70,0.12)" border="rgba(230,57,70,0.3)" label={label} size={size} />;
    default:
      return <Badge icon={AlertTriangle} color="#8888AA" bg="rgba(136,136,170,0.12)" border="rgba(136,136,170,0.3)" label={label} size={size} />;
  }
}

// ============================================
// GUEST STATUS
// ============================================
export const GUEST_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  staying: 'Hospedado',
  checked_out: 'Salió',
  inactive: 'Inactivo',
  vip: 'VIP',
  blacklisted: 'Bloqueado',
};

export function GuestStatusBadge({ status, size }: { status: string; size?: 'sm' | 'md' }) {
  const label = GUEST_STATUS_LABELS[status] ?? status;
  switch (status) {
    case 'active':
      return <Badge icon={UserCheck} color="#2EC4B6" bg="rgba(46,196,182,0.12)" border="rgba(46,196,182,0.3)" label={label} size={size} />;
    case 'staying':
      return <Badge icon={BedDouble} color="#C9A84C" bg="rgba(201,168,76,0.12)" border="rgba(201,168,76,0.3)" label={label} size={size} />;
    case 'vip':
      return <Badge icon={Star} color="#FFD700" bg="rgba(255,215,0,0.12)" border="rgba(255,215,0,0.3)" label={label} size={size} />;
    case 'blacklisted':
      return <Badge icon={Ban} color="#E63946" bg="rgba(230,57,70,0.12)" border="rgba(230,57,70,0.3)" label={label} size={size} />;
    case 'inactive':
      return <Badge icon={Clock} color="#8888AA" bg="rgba(136,136,170,0.12)" border="rgba(136,136,170,0.3)" label={label} size={size} />;
    default:
      return <Badge icon={Sparkles} color="#7B5EA7" bg="rgba(123,94,167,0.12)" border="rgba(123,94,167,0.3)" label={label} size={size} />;
  }
}

// ============================================
// ROOM STATUS
// ============================================
export const ROOM_STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  occupied: 'Ocupada',
  cleaning: 'Limpieza',
  maintenance: 'Mantenimiento',
  out_of_order: 'Fuera de servicio',
};

export function RoomStatusBadge({ status, size }: { status: string; size?: 'sm' | 'md' }) {
  const label = ROOM_STATUS_LABELS[status] ?? status;
  switch (status) {
    case 'available':
      return <Badge icon={CheckCircle2} color="#2EC4B6" bg="rgba(46,196,182,0.12)" border="rgba(46,196,182,0.3)" label={label} size={size} />;
    case 'occupied':
      return <Badge icon={BedDouble} color="#C9A84C" bg="rgba(201,168,76,0.12)" border="rgba(201,168,76,0.3)" label={label} size={size} />;
    case 'cleaning':
      return <Badge icon={Sparkles} color="#7B5EA7" bg="rgba(123,94,167,0.12)" border="rgba(123,94,167,0.3)" label={label} size={size} />;
    case 'maintenance':
    case 'out_of_order':
      return <Badge icon={AlertTriangle} color="#FF9F1C" bg="rgba(255,159,28,0.12)" border="rgba(255,159,28,0.3)" label={label} size={size} />;
    default:
      return <Badge icon={CreditCard} color="#8888AA" bg="rgba(136,136,170,0.12)" border="rgba(136,136,170,0.3)" label={label} size={size} />;
  }
}

// ============================================
// SITE STATUS
// ============================================
export const SITE_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  maintenance: 'Mantenimiento',
  closed: 'Cerrado',
};

export function SiteStatusBadge({ status, size }: { status: string; size?: 'sm' | 'md' }) {
  const label = SITE_STATUS_LABELS[status] ?? status;
  switch (status) {
    case 'active':
      return <Badge icon={CheckCircle2} color="#2EC4B6" bg="rgba(46,196,182,0.12)" border="rgba(46,196,182,0.3)" label={label} size={size} />;
    case 'maintenance':
      return <Badge icon={AlertTriangle} color="#FF9F1C" bg="rgba(255,159,28,0.12)" border="rgba(255,159,28,0.3)" label={label} size={size} />;
    case 'closed':
      return <Badge icon={Ban} color="#E63946" bg="rgba(230,57,70,0.12)" border="rgba(230,57,70,0.3)" label={label} size={size} />;
    default:
      return <Badge icon={AlertTriangle} color="#8888AA" bg="rgba(136,136,170,0.12)" border="rgba(136,136,170,0.3)" label={label} size={size} />;
  }
}

// ============================================
// MONEY HELPERS
// ============================================
export function formatMoney(cents: number, currency: string = 'USD'): string {
  const amount = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
