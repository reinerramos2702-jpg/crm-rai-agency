import React from 'react';
import {
  Banknote, CreditCard, ArrowLeftRight, Wallet, CircleDollarSign, HandCoins,
  Bitcoin, ReceiptText, CircleEllipsis, type LucideIcon,
} from 'lucide-react';
import { methodLabel, statusLabel } from '@/lib/payments-view';

const METHOD_ICONS: Record<string, LucideIcon> = {
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowLeftRight,
  paypal: Wallet,
  stripe: CircleDollarSign,
  mercadopago: HandCoins,
  crypto: Bitcoin,
  check: ReceiptText,
  other: CircleEllipsis,
};

export function MethodChip({ method }: { method: string }) {
  const Icon = METHOD_ICONS[method] ?? CircleEllipsis;
  return (
    <span className="pg-method" title={methodLabel(method)}>
      <Icon size={14} aria-hidden="true" />
      <span>{methodLabel(method)}</span>
    </span>
  );
}

const DOT: Record<string, string> = {
  paid: 'fx-dot--ok',
  pending: 'fx-dot--warn',
  under_review: 'fx-dot--warn',
  failed: 'fx-dot--danger',
  refunded: 'pg-dot--purple',
};

/** Insignia de estado: punto `fx-dot` + texto (el color nunca es el único indicador). */
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`pg-status pg-status--${status}`}>
      <span className={`fx-dot ${DOT[status] ?? ''}`.trim()} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
