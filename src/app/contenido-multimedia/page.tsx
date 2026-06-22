'use client';

import { FolderOpen, Image, Video, FileText } from 'lucide-react';
import ModulePlaceholder from '@/components/ModulePlaceholder';

export default function ContenidoMultimediaPage() {
  return (
    <ModulePlaceholder
      icon={FolderOpen}
      title="Contenido multimedia"
      subtitle="Biblioteca de imágenes, videos y archivos para tu marca."
      count={0}
      countLabel="archivos"
      primaryLabel="Subir archivo"
      showImport
      tabs={[
        { id: 'imagenes', label: 'Imágenes', icon: Image },
        { id: 'videos', label: 'Videos', icon: Video },
        { id: 'documentos', label: 'Documentos', icon: FileText },
      ]}
      emptyTitle="Tu biblioteca está vacía"
      emptyHint="Sube los assets de tu marca para reutilizarlos en campañas, plantillas y sitios."
    />
  );
}
