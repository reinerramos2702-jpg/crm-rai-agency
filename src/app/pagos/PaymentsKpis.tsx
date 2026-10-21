import React from 'react';
import { CheckCircle2, Clock, RefreshCw, Receipt, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatMoney } from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';
import type { Delta, PaymentsSummary } from '@/lib/payments-view';
import { totalCount } from '@/lib/payments-view';

interface Props {
  summary: PaymentsSummary;
  delta: Delta | null;
  syncing: boolean;
}

interface KpiProps {
  icon: typeof CheckCircle2;
  tone: 'ok' | 'warn' | 'purple' | 'gold';
  label: string;
  value: string;
  hint: string;
  sub?: React.ReactNode;
  syncing: boolean;
}

function Kpi({ icon: Icon, tone, label, value, hint, sub, syncing }: KpiProps) {
  return (
    <div className={`card pg-kpi fx-sync${syncing ? ' is-syncing' : ''}`} data-tone={tone}>
      <div className="pg-kpi-top">
        <span className="pg-kpi-icon" aria-hidden="true"><Icon size={16} /></span>
        <span className="pg-kpi-label">{label}</span>
        <HelpTip content={hint} size={12} />
      </div>
      <div className="pg-kpi-value">{value}</div>
      <div className="pg-kpi-sub">{sub}</div>
    </div>
  );
}

function DeltaChip({ delta }: { delta: Delta }) {
  const Icon = delta.direction === 'up' ? TrendingUp : delta.direction === 'down' ? TrendingDown : Minus;
  const sign = delta.pct > 0 ? '+' : '';
  return (
    <span className={`pg-delta pg-delta--${delta.direction}`}>
      <Icon size={12} aria-hidden="true" />
      {sign}{delta.pct} % <span className="pg-delta-note">vs. 30 días previos</span>
    </span>
  );
}

export function PaymentsKpis({ summary, delta, syncing }: Props) {
  const paid = summary.statusCounts.paid ?? 0;
  const open = (summary.statusCounts.pending ?? 0) + (summary.statusCounts.under_review ?? 0);
  return (
    <div className="pg-kpis">
      <Kpi
        icon={CheckCircle2} tone="ok" label="Cobrado" syncing={syncing}
        value={formatMoney(summary.paidCents)}
        hint="Suma de los pagos en estado «Pagado», de todos los métodos."
        sub={delta ? <DeltaChip delta={delta} /> : `${paid} ${paid === 1 ? 'pago' : 'pagos'}`}
      />
      <Kpi
        icon={Clock} tone="warn" label="Por cobrar" syncing={syncing}
        value={formatMoney(summary.pendingCents)}
        hint="Pagos pendientes o en revisión que aún no han ingresado."
        sub={`${open} por resolver`}
      />
      <Kpi
        icon={RefreshCw} tone="purple" label="Reembolsado" syncing={syncing}
        value={formatMoney(summary.refundedCents)}
        hint="Monto total devuelto a clientes."
        sub={`${summary.statusCounts.refunded ?? 0} reembolsos`}
      />
      <Kpi
        icon={Receipt} tone="gold" label="Transacciones" syncing={syncing}
        value={String(totalCount(summary))}
        hint="Número total de pagos registrados, en cualquier estado."
        sub="Todos los estados"
      />
    </div>
  );
}
