import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Esqueleto instantáneo mientras se resuelve la ruta (Next lo muestra al hacer clic en el menú). */
export default function Loading() {
  return <PageSkeleton title="Claves de IA" cards={0} rows={5} />;
}
