import { MarketingSkeleton } from './_components/MarketingSkeleton';
import './marketing.css';

/** Esqueleto instantáneo mientras se resuelve la ruta (Next lo muestra al hacer clic en el menú). */
export default function Loading() {
  return <MarketingSkeleton />;
}
