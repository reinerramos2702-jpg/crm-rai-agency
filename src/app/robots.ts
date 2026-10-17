import type { MetadataRoute } from 'next';

/** El CRM es privado: se pide a los buscadores que no rastreen ninguna ruta. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
