import { SkeletonLine } from '@/components/ui/Skeleton';
import { CalendarGridSkeleton, GroupsSkeleton } from './_components/CalendarsSkeleton';
import './calendarios.css';

/** Esqueleto instantáneo mientras se resuelve la ruta: misma estructura que la pantalla (cabecera, pestañas, grupos y tarjetas). */
export default function Loading() {
  return (
    <div className="container cal-page" aria-busy="true">
      <div className="cal-head">
        <div>
          <div className="cal-title"><h1 className="h1">Calendarios</h1></div>
          <p className="muted cal-lead">Gestiona tus calendarios, citas y conexiones externas.</p>
        </div>
      </div>
      <div className="cal-tabs" aria-hidden="true">
        {[104, 72, 104].map((w, i) => <span key={i} className="cal-tab"><SkeletonLine width={w} height={14} /></span>)}
      </div>
      <div className="cal-cq">
        <div className="cal-layout">
          <aside className="card cal-groups">
            <div className="cal-groups-head"><span className="cal-card-title">Grupos</span></div>
            <GroupsSkeleton />
          </aside>
          <section className="cal-panel">
            <div className="cal-panel-head"><span className="cal-card-title">Todos los calendarios</span></div>
            <CalendarGridSkeleton />
          </section>
        </div>
      </div>
    </div>
  );
}
