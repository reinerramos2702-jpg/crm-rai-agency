'use client';

/**
 * Spinner de carga animado con colores RAI.
 */
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 14, md: 20, lg: 32 };
  const px = sizes[size];

  return (
    <span
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        border: '2px solid var(--rai-border)',
        borderTopColor: 'var(--rai-gold)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}
