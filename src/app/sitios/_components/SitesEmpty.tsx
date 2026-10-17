import React from 'react';
import { BedDouble, CalendarCheck, CreditCard, Plus } from 'lucide-react';
import { SiteTypeIcon } from './SiteTypeIcon';
import { TYPE_LABELS } from './site-model';

const GHOST_TYPES = ['hotel', 'restaurant', 'office'] as const;

const BENEFITS = [
  { icon: BedDouble, title: 'Habitaciones', text: 'Inventario por sitio con su estado al día.' },
  { icon: CalendarCheck, title: 'Reservas', text: 'Cada reserva queda vinculada a su locación.' },
  { icon: CreditCard, title: 'Pagos', text: 'Ingresos del mes y métricas por sede.' },
];

/** Tarjeta fantasma: anticipa cómo se verá un sitio ya registrado. */
function Ghost({ type }: { type: string }) {
  return (
    <div className="st-ghost">
      <div className="st-ghost-top">
        <span className="st-ghost-icon"><SiteTypeIcon type={type} size={16} /></span>
        <span className="st-ghost-lines"><i /><i /></span>
        <i className="st-ghost-pill" />
      </div>
      <i className="st-ghost-line" />
      <div className="st-ghost-metrics"><i /><i /><i /></div>
    </div>
  );
}

/** Estado vacío de Sitios: vista previa de lo que aparecerá y arranque rápido por tipo de locación. */
export function SitesEmpty({ onCreate }: { onCreate: (type?: string) => void }) {
  return (
    <section className="card st-empty" aria-labelledby="st-empty-title">
      <div className="st-ghosts" aria-hidden="true">
        {GHOST_TYPES.map((t) => <Ghost key={t} type={t} />)}
      </div>

      <div className="st-empty-copy">
        <h2 id="st-empty-title" className="st-empty-title">Aún no tienes sitios registrados</h2>
        <p className="st-empty-text">
          Registra tu primera locación para vincular habitaciones, reservas y pagos. Elige el tipo y completa los datos en un minuto.
        </p>
      </div>

      <div className="st-quick" role="group" aria-label="Crear un sitio por tipo">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <button key={type} type="button" className="secondary st-quick-btn" onClick={() => onCreate(type)}>
            <SiteTypeIcon type={type} size={15} /> {label}
          </button>
        ))}
      </div>
      <button type="button" className="primary" onClick={() => onCreate()}>
        <Plus size={14} aria-hidden="true" /> Crear primer sitio
      </button>

      <ul className="st-benefits">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="st-benefit">
            <span className="st-benefit-icon" aria-hidden="true"><Icon size={16} /></span>
            <strong>{title}</strong>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
