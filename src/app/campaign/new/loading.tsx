import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Esqueleto instantáneo mientras se resuelve la ruta (Next lo muestra al hacer clic en el menú). */
export default function Loading() {
  return <PageSkeleton title="Nueva Campaña" cards={0} rows={6} />;
}
