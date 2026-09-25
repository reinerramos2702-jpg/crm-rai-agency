'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/**
 * Shell de las páginas públicas de auth (/login, /registro).
 * Mismo patrón que /book/[slug]: overlay full-screen con zIndex alto para
 * tapar el Sidebar del layout raíz, sin refactor de route groups.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--rai-dark)',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '40px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Image
            src="/crystal-logo.webp"
            alt="RAI Agency"
            width={40}
            height={40}
            sizes="40px"
            style={{
              width: 40,
              height: 40,
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 8px rgba(123, 94, 167, 0.4))',
            }}
          />
          <div>
            <div
              className="gradient-text"
              style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              RAI
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--rai-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Agency CRM
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '28px 24px' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--rai-text)', marginBottom: 4 }}>
            {title}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--rai-muted)', marginBottom: 20 }}>{subtitle}</p>
          {children}
        </div>

        <p style={{ fontSize: 13, color: 'var(--rai-muted)', textAlign: 'center', marginTop: 16 }}>
          {footer}
        </p>
      </div>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{ color: 'var(--rai-gold)', textDecoration: 'none', fontWeight: 600 }}
    >
      {children}
    </Link>
  );
}
