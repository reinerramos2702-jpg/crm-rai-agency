import React from 'react';
import Link from 'next/link';
import { CalendarClock, Images, Megaphone, Sparkles, type LucideIcon } from 'lucide-react';
import { KIND_LABELS, MEDIA_KINDS, type MediaKind } from '@/lib/media-types';
import { KIND_ICONS } from './kind-icons';

interface FlowStep {
  icon: LucideIcon;
  title: string;
  text: string;
}

const FLOW_STEPS: FlowStep[] = [
  { icon: Sparkles, title: 'Genera imágenes', text: 'Cada imagen que crees en una grilla del Generador aparece aquí.' },
  { icon: Megaphone, title: 'Lanza campañas', text: 'Los videos, voces e imágenes de tus campañas se reúnen aquí.' },
  { icon: CalendarClock, title: 'Programa publicaciones', text: 'Los medios de tus publicaciones programadas también se listan.' },
];

const GHOST_KINDS: MediaKind[] = ['image', 'video', 'image', 'audio', 'image', 'document'];

/** Estado vacío de la biblioteca: muestra cómo se verá, de dónde llegan los archivos y los dos caminos para empezar. */
export function LibraryEmpty({ onAddLink }: { onAddLink: () => void }) {
  return (
    <section className="mm-empty" aria-labelledby="mm-empty-title">
      <div className="mm-empty-tabs" aria-hidden="true">
        {MEDIA_KINDS.map((k) => {
          const Icon = KIND_ICONS[k];
          return <span key={k} className="mm-empty-tab"><Icon size={14} />{KIND_LABELS[k]}<b>0</b></span>;
        })}
      </div>

      <div className="mm-empty-mosaic" aria-hidden="true">
        {GHOST_KINDS.map((kind, i) => {
          const Icon = KIND_ICONS[kind];
          return (
            <div key={`${kind}-${i}`} className="mm-empty-tile">
              <span className="mm-empty-thumb"><Icon size={22} /></span>
              <i /><i />
            </div>
          );
        })}
      </div>

      <div className="mm-empty-copy">
        <h2 id="mm-empty-title">Tu biblioteca aún no tiene archivos</h2>
        <p>Se llena sola con lo que creas en el CRM. No necesitas subir nada: en cuanto generes, aparecerá aquí.</p>
      </div>

      <ol className="mm-empty-steps">
        {FLOW_STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="mm-empty-step">
            <span className="mm-empty-num" aria-hidden="true">{i + 1}</span>
            <span className="mm-empty-sicon" aria-hidden="true"><Icon size={16} /></span>
            <strong>{title}</strong>
            <span>{text}</span>
          </li>
        ))}
      </ol>

      <div className="mm-form-actions mm-center">
        <Link href="/generador-imagenes" className="btn btn-primary">
          <Images size={16} /> Ir al Generador
        </Link>
        <button type="button" className="btn-secondary" onClick={onAddLink}>
          Añadir un enlace
        </button>
      </div>
    </section>
  );
}
