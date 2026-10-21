import React from 'react';
import Link from 'next/link';
import { ChevronRight, Mail, MapPin, Phone } from 'lucide-react';
import { StatusPill } from './StatusDot';
import { SiteTypeIcon } from './SiteTypeIcon';
import { formatLocation, statusTone, telHref, typeLabel, type Site } from './site-model';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="st-metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Tarjeta de sede: toda la tarjeta navega al detalle; las acciones rápidas quedan por encima. */
export function SiteCard({ site }: { site: Site }) {
  const location = formatLocation(site);
  const contact = [site.contactName, site.contactPhone].filter(Boolean).join(' · ');
  const phone = site.contactPhone?.trim() ?? '';
  const email = site.contactEmail?.trim() ?? '';
  const who = site.contactName || site.name;
  return (
    <article className="card st-card fx-reveal" data-tone={statusTone(site.status)}>
      <div className="st-card-top">
        <span className="st-card-icon"><SiteTypeIcon type={site.type} /></span>
        <div className="st-card-id">
          <h3 className="st-card-name">
            <Link href={`/sitios/${site.id}`} className="st-card-link">{site.name}</Link>
          </h3>
          <span className="st-card-type">{typeLabel(site.type)}</span>
        </div>
        <StatusPill status={site.status} />
      </div>

      <p className="st-card-loc">
        <MapPin size={12} aria-hidden="true" />
        <span>{location || 'Sin ubicación registrada'}</span>
      </p>

      <dl className="st-metrics">
        <Metric label="Habitaciones" value={String(site._count.rooms)} />
        <Metric label="Reservas" value={String(site._count.bookings)} />
        <Metric label="Aforo" value={site.capacity > 0 ? String(site.capacity) : '—'} />
      </dl>

      <div className="st-card-foot">
        <span className="st-card-contact">{contact || 'Sin contacto'}</span>
        <div className="st-card-actions">
          <span className="fx-reveal-actions st-qa-group">
            {phone && (
              <a className="st-qa" href={telHref(phone)} aria-label={`Llamar a ${who}`} title="Llamar">
                <Phone size={14} aria-hidden="true" />
              </a>
            )}
            {email && (
              <a className="st-qa" href={`mailto:${email}`} aria-label={`Escribir a ${who}`} title="Enviar correo">
                <Mail size={14} aria-hidden="true" />
              </a>
            )}
          </span>
          <ChevronRight size={16} className="st-card-go" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}
