import { PageSkeleton } from '@/components/ui/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton
      title="Centro de voz"
      subtitle="Activación, uso, llamadas y ajustes del agente de voz."
      cards={3}
      rows={4}
    />
  );
}
