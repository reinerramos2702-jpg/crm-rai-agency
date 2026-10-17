import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, CheckCircle2, Copy, Info, RotateCw, type LucideIcon } from 'lucide-react';
import type { Msg } from './shared';

type NoteTone = 'info' | 'warn';

export function Note({ tone = 'info', children }: { tone?: NoteTone; children: React.ReactNode }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info;
  return (
    <div className={`mkt-note is-${tone}`} role="note">
      <Icon size={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function NeedKeyNote({ provider, why }: { provider: string; why: string }) {
  return (
    <Note tone="warn">
      <strong>Requiere clave de {provider}.</strong> {why}{' '}
      <Link href="/keys">Agregar clave en Claves API</Link> (solo administradores).
    </Note>
  );
}

interface InlineErrorProps {
  title: string;
  detail?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/** Error que convive con la interfaz: nunca la reemplaza y siempre ofrece «Reintentar». */
export function InlineError({ title, detail, onRetry, retrying }: InlineErrorProps) {
  return (
    <div className="mkt-note is-error" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {detail ? ` ${detail}` : ''}
        {onRetry && (
          <div className="mkt-note-actions">
            <button type="button" className="mkt-btn" disabled={retrying} onClick={onRetry}>
              <RotateCw size={14} aria-hidden="true" />
              {retrying ? 'Reintentando…' : 'Reintentar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface CardTitleProps {
  id: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  /** Dato breve alineado a la derecha (cantidad, estado…). */
  meta?: React.ReactNode;
}

/** Cabecera de tarjeta común a todas las pestañas. */
export function CardTitle({ id, icon: Icon, children, meta }: CardTitleProps) {
  return (
    <h2 id={id} className="mkt-card-title">
      {Icon && <span className="mkt-ico" aria-hidden="true"><Icon size={16} /></span>}
      <span className="mkt-card-title-text">{children}</span>
      {meta !== undefined && <small>{meta}</small>}
    </h2>
  );
}

/** Resultado de una acción: confirma con ✓ o avisa del error (se anuncia a lectores de pantalla). */
export function StatusMsg({ msg }: { msg: Msg | null }) {
  if (!msg) return null;
  const ok = msg.kind === 'ok';
  return (
    <p className={`mkt-msg is-${msg.kind}`} role={ok ? 'status' : 'alert'}>
      {ok ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
      <span>{msg.text}</span>
    </p>
  );
}

interface MeterProps {
  value: number;
  label: string;
  tone?: 'ok' | 'warn' | 'danger';
}

export function Meter({ value, label, tone }: MeterProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`mkt-meter${tone ? ` t-${tone}` : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Barra de progreso indeterminada para tareas largas (solo transform). */
export function BusyBar() {
  return <div className="mkt-progress" aria-hidden="true"><span /></div>;
}

interface CopyButtonProps {
  id: string;
  text: string;
  copied: string | null;
  onCopy: (id: string, text: string) => void;
  label?: string;
  disabled?: boolean;
}

export function CopyButton({ id, text, copied, onCopy, label = 'Copiar', disabled }: CopyButtonProps) {
  const done = copied === id;
  const failed = copied === `${id}:error`;
  return (
    <button type="button" className={`mkt-btn${done ? ' is-done' : ''}`} disabled={disabled} onClick={() => onCopy(id, text)}>
      {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span aria-live="polite">{done ? 'Copiado' : failed ? 'No se pudo copiar' : label}</span>
    </button>
  );
}
