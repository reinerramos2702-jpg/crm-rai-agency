import { TopBar } from '@/components/layout/TopBar';
import { SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton';
import './campaign-new.css';

/** Esqueleto instantáneo con la misma estructura de dos paneles: evita saltos al llegar la página. */
export default function Loading() {
  return (
    <>
      <TopBar title="Nueva Campaña" subtitle="Planifica tu campaña de contenido con IA" />
      <div className="cn-layout cn-v2" aria-busy="true">
        <span className="fx-sr-only" role="status">Cargando…</span>
        <div className="cn-side">
          <SkeletonLine width="45%" />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
        <div className="cn-chat">
          <div className="cn-chat-head">
            <SkeletonLine width={180} height={16} />
          </div>
          <div className="chat-log cn-chat-log">
            <SkeletonCard lines={4} />
          </div>
        </div>
      </div>
    </>
  );
}
