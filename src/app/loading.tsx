import { PageSkeleton } from '@/components/ui/PageSkeleton';

/**
 * Esqueleto genérico (sin título): es el respaldo de toda ruta que no tenga su
 * propio `loading.tsx`. Cada módulo de primer nivel define el suyo con su título.
 */
export default function Loading() {
  return <PageSkeleton cards={3} rows={4} />;
}
