import React from 'react';
import Link from 'next/link';
import { BedDouble, CalendarCheck, CalendarClock, Landmark, MapPin, Pencil, Trash2 } from 'lucide-react';
import { formatMoney } from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';
import { SiteTypeIcon } from './SiteTypeIcon';
import { StatusPill } from './StatusDot';
import { formatLocation, typeLabel, type SiteDetail, type SiteMetrics } from './site-model';

function Kpi({ icon: Icon, label, value, hint }: {
  icon: typeof BedDouble; label: string; value: React.ReactNode; hint: string;
}) {
  return (
    <div className="card st-tile">
      <span className="st-tile-icon" aria-hidden="true"><Icon size={16} /></span>
      <div className="st-tile-body">
        <span className="st-tile-label">{label} <HelpTip content={hint} size={11} /></span>
        <span className="st-tile-value">{value}</span>
      </div>
    </div>
  );
}

export function Breadcrumbs({ name }: { name: string }) {
  return (
    <nav className="st-crumbs" aria-label="Ruta de navegación">
      <Link href="/sitios" className="st-crumb-link">Sitios</Link>
      <span aria-hidden="true" className="st-crumb-sep">/</span>
      <span aria-current="page" className="st-crumb-current">{name}</span>
    </nav>
  );
}

interface Props {
  site: SiteDetail;
  metrics: SiteMetrics | undefined;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function DetailHeader({ site, metrics, editing, onEdit, onDelete }: Props) {
  const location = formatLocation(site);
  return (
    <section className="card st-hero" aria-label="Resumen del sitio">
      <div className="st-hero-top">
        <span className="st-hero-icon" aria-hidden="true"><SiteTypeIcon type={site.type} size={22} /></span>
        <div className="st-hero-id">
          <div className="st-hero-title">
            <h1 className="h1">{site.name}</h1>
            <StatusPill status={site.status} />
          </div>
          <p className="muted st-hero-meta">
            <span>{typeLabel(site.type)}</span>
            {location && (
              <span className="st-hero-loc"><MapPin size={12} aria-hidden="true" /> {location}</span>
            )}
          </p>
        </div>
        <div className="st-head-actions">
          {!editing && (
            <button type="button" className="secondary" onClick={onEdit}>
              <Pencil size={14} aria-hidden="true" /> Editar
            </button>
          )}
          <button type="button" className="danger" onClick={onDelete}>
            <Trash2 size={14} aria-hidden="true" /> Eliminar
          </button>
        </div>
      </div>

      <div className="st-kpis">
        <Kpi icon={BedDouble} label="Habitaciones" value={site.rooms.length} hint="Total de habitaciones registradas en este sitio." />
        <Kpi icon={CalendarCheck} label="Reservas totales" value={site._count.bookings} hint="Histórico de reservas asociadas a este sitio." />
        <Kpi icon={CalendarClock} label="Reservas activas" value={metrics?.activeBookings ?? 0} hint="Reservas en estado «confirmada» o «check-in»." />
        <Kpi icon={Landmark} label="Ingresos del mes" value={formatMoney(metrics?.monthRevenueCents ?? 0)} hint="Suma de pagos cobrados en el mes actual asociados a este sitio." />
      </div>
    </section>
  );
}
