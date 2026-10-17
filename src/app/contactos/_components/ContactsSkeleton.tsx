import React from 'react';

const WIDTHS = ['72%', '58%', '84%', '64%', '78%'];

/** Esqueleto con las medidas finales de la tabla (misma altura de fila: sin saltos al cargar). */
export function ContactsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="crm-card" aria-busy="true" role="status">
      <span className="fx-sr-only">Cargando contactos…</span>
      <div className="crm-tablewrap">
        <table className="crm-table crm-table--skel" aria-hidden="true">
          <thead>
            <tr>
              <th className="col-check"><span className="fx-shimmer crm-skel" style={{ height: 11, width: 16 }} /></th>
              {[88, 64, 72, 64, 72, 88, 56].map((w, i) => (
                <th key={i}><span className="fx-shimmer crm-skel" style={{ height: 11, width: w }} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r} className="crm-row">
                <td className="col-check"><span className="fx-shimmer crm-skel crm-skel--box" /></td>
                <td className="col-name">
                  <span className="crm-cell-person">
                    <span className="fx-shimmer crm-skel crm-skel--avatar" />
                    <span className="fx-shimmer crm-skel" style={{ width: WIDTHS[r % WIDTHS.length] }} />
                  </span>
                </td>
                {[0, 1, 2, 3, 4].map((c) => (
                  <td key={c} className={c > 2 ? 'col-date' : undefined}>
                    <span className="fx-shimmer crm-skel" style={{ width: WIDTHS[(r + c + 1) % WIDTHS.length] }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
