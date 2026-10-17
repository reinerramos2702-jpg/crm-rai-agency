import { ReportsSkeleton } from './_components/ReportsSkeleton';
import './_components/informes.css';

/** Esqueleto instantáneo con la misma estructura que la página (sin saltos de diseño). */
export default function Loading() {
  return <ReportsSkeleton />;
}
