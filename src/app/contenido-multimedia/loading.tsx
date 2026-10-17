import { TopBar } from '@/components/layout/TopBar';
import { MediaPageSkeleton } from './MediaSkeleton';
import './media.css';

/** Esqueleto instantáneo con la estructura real de la biblioteca (pestañas, barra y cuadrícula). */
export default function Loading() {
  return (
    <>
      <TopBar title="Contenido multimedia" subtitle="Todo lo que ya generaste, en un solo lugar." />
      <MediaPageSkeleton />
    </>
  );
}
