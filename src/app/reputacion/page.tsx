'use client';

import { Star, MessageSquare, Send, Globe } from 'lucide-react';
import ModulePlaceholder from '@/components/ModulePlaceholder';

export default function ReputacionPage() {
  return (
    <ModulePlaceholder
      icon={Star}
      title="Reputación"
      subtitle="Reseñas, solicitudes de calificación y widgets para tu web."
      count={0}
      countLabel="reseñas"
      primaryLabel="Solicitar reseña"
      tabs={[
        { id: 'resenas', label: 'Reseñas', icon: Star },
        { id: 'solicitudes', label: 'Solicitudes', icon: Send },
        { id: 'plantillas', label: 'Plantillas', icon: MessageSquare },
        { id: 'widgets', label: 'Widgets', icon: Globe },
      ]}
      emptyTitle="Aún no tienes reseñas"
      emptyHint="Envía solicitudes de reseña por SMS o email y muestra las mejores en tu sitio con un widget."
    />
  );
}
