import React from 'react';
import { Megaphone } from 'lucide-react';

/** Encabezado de /marketing. Sin estado: lo comparten la página y su esqueleto para que no haya saltos. */
export function MarketingHead({ status }: { status: React.ReactNode }) {
  return (
    <header className="mkt-head">
      <div className="mkt-head-main">
        <span className="mkt-head-ico" aria-hidden="true"><Megaphone size={22} /></span>
        <div>
          <h1>Marketing</h1>
          <p className="muted">Planifica publicaciones, mide enlaces y cuida tu marca desde un solo lugar.</p>
        </div>
      </div>
      {status}
    </header>
  );
}
