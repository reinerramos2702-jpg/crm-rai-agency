import { PageSkeleton } from '@/components/ui/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton
      title="Agentes de IA"
      subtitle="Centraliza tus agentes de chat y de voz: entrenamiento, bases de conocimiento y métricas."
      cards={4}
      rows={4}
    />
  );
}
