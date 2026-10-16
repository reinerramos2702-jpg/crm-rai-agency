import { WizardSkeleton } from './WizardSkeleton';
import '../generador.css';
import '../wizard.css';

/** Esqueleto instantáneo del wizard mientras llegan los datos de la grilla. */
export default function Loading() {
  return <WizardSkeleton />;
}
