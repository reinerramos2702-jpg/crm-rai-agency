import { Plus } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { MediaPageSkeleton } from './MediaSkeleton';

/** Esqueleto instantáneo con la estructura real de la biblioteca (pestañas, barra y cuadrícula). */
export default function Loading() {
  return (
    <>
      <TopBar
        title="Contenido multimedia"
        subtitle="Todo lo que ya generaste y programaste, reunido en un solo lugar."
        actions={
          <button type="button" className="btn-primary" disabled>
            <Plus size={16} />
            Añadir
          </button>
        }
      />
      <MediaPageSkeleton />
    </>
  );
}
