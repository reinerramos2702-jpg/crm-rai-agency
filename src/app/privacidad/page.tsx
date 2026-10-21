import { AuthShell, AuthLink } from '@/components/auth/AuthShell';

export const metadata = { title: 'Política de privacidad — RAI Agency' };

/**
 * Placeholder legal. NO inventar texto legal: el documento definitivo lo
 * redacta/aprueba Reiner (idealmente con asesoría legal) antes de producción.
 */
export default function Page() {
  return (
    <AuthShell
      title="Política de privacidad"
      subtitle="Documento en preparación."
      footer={
        <>
          <AuthLink href="/registro">Volver al registro</AuthLink>
        </>
      }
    >
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--rai-text-secondary, #B9B9D0)' }}>
        Estamos redactando este documento. Estará publicado aquí antes del lanzamiento público.
      </p>
    </AuthShell>
  );
}
