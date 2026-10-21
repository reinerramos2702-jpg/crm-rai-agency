const usdFmt = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const usd = (n: number): string => usdFmt.format(n);

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

export const pct = (ratio: number): number => Math.min(100, Math.max(0, Math.round(ratio * 100)));
