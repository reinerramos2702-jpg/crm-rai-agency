import { PageSkeleton } from '@/components/ui/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton
      title="Automatización"
      subtitle="Diseña flujos que reaccionan a eventos del CRM o que corren en segundo plano según el calendario."
      cards={0}
      rows={5}
    />
  );
}
