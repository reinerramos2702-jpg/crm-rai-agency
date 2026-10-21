// El recorrido guiado vive ahora en `components/tour`. Este archivo se mantiene
// como reexportación para no romper las importaciones existentes.
export { default } from '../tour/ProductTour';
export type { TourStep, TourHint, TourTarget } from '../tour/ProductTour';
