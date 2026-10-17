import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { telHref, typeLabel, type SiteDetail } from './site-model';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="st-info-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const dash = <span className="muted">—</span>;
const text = (v: string | null | undefined) => (v && v.trim() ? v : dash);

/** Ficha de datos del sitio, agrupada en secciones de solo lectura. */
export function SiteInfo({ site }: { site: SiteDetail }) {
  const phone = site.contactPhone?.trim();
  const email = site.contactEmail?.trim();
  return (
    <section className="card st-info" aria-labelledby="st-info-title">
      <div className="st-section-head">
        <h2 id="st-info-title" className="st-section-title">Información</h2>
      </div>
      <div className="st-info-cols">
        <dl className="st-info-list">
          <Row label="Tipo">{typeLabel(site.type)}</Row>
          <Row label="Aforo">{site.capacity > 0 ? site.capacity : 'Sin límite definido'}</Row>
          <Row label="Identificador"><code className="st-code">{site.slug}</code></Row>
        </dl>
        <dl className="st-info-list">
          <Row label="Dirección">{text(site.address)}</Row>
          <Row label="Ciudad">{text(site.city)}</Row>
          <Row label="País">{text(site.country)}</Row>
          <Row label="Código postal">{text(site.postalCode)}</Row>
        </dl>
        <dl className="st-info-list">
          <Row label="Contacto">{text(site.contactName)}</Row>
          <Row label="Teléfono">
            {phone ? <a className="st-link" href={telHref(phone)}><Phone size={12} aria-hidden="true" /> {phone}</a> : dash}
          </Row>
          <Row label="Correo">
            {email ? <a className="st-link" href={`mailto:${email}`}><Mail size={12} aria-hidden="true" /> {email}</a> : dash}
          </Row>
        </dl>
      </div>
      {site.notes && site.notes.trim() && (
        <div className="st-notes">
          <span className="st-notes-label">Notas</span>
          <p>{site.notes}</p>
        </div>
      )}
    </section>
  );
}
