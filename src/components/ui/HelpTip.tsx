'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTipProps {
  /** Contenido del tooltip (texto breve, ~1-3 oraciones) */
  content: React.ReactNode;
  /** Tamaño del icono (default 14) */
  size?: number;
  /** Posición preferida (default 'top') */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Si se pasa, el tooltip se ancla a este children en lugar de mostrar icono ? */
  children?: React.ReactNode;
  /** Ancho máximo del tooltip en px (default 260) */
  maxWidth?: number;
  /** Estilo extra para el wrapper */
  className?: string;
  /** Inline style del wrapper */
  style?: React.CSSProperties;
}

/**
 * Tooltip contextual reutilizable.
 *
 * Uso simple (icono ? con texto al hover):
 *   <HelpTip content="Explicación corta del campo" />
 *
 * Uso wrapper (cualquier elemento dispara el tooltip):
 *   <HelpTip content="Aprobará el pago"><button>Aprobar</button></HelpTip>
 */
export function HelpTip({
  content,
  size = 14,
  side = 'top',
  children,
  maxWidth = 260,
  className,
  style,
}: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // Cerrar al hacer clic fuera (para móvil)
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const positions: Record<typeof side, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%) translateY(8px)' },
    left: { right: '100%', top: '50%', transform: 'translateX(-8px) translateY(-50%)' },
    right: { left: '100%', top: '50%', transform: 'translateX(8px) translateY(-50%)' },
  };

  return (
    <span
      ref={wrapRef}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        ...style,
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children ?? (
        <button
          type="button"
          aria-label="Ayuda"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((p) => !p);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 0,
            padding: 0,
            cursor: 'help',
            color: 'var(--rai-muted)',
          }}
        >
          <HelpCircle size={size} />
        </button>
      )}

      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 1000,
            ...positions[side],
            background: 'var(--rai-card)',
            border: '1px solid var(--rai-border)',
            borderLeft: '2px solid var(--rai-gold)',
            color: 'var(--rai-text)',
            fontSize: 12,
            lineHeight: 1.5,
            padding: '8px 12px',
            borderRadius: 8,
            maxWidth,
            width: 'max-content',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            whiteSpace: 'normal',
            textAlign: 'left',
            fontWeight: 400,
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export default HelpTip;
