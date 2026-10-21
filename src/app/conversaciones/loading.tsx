import { ChatSkeleton } from './_components/ChatSkeleton';

/** Estructura real de la pantalla (cabecera, pestañas y lista) mientras se resuelve la ruta, sin saltos al cargar. */
export default function Loading() {
  return <ChatSkeleton />;
}
