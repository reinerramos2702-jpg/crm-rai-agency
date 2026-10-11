'use client';

import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AuthShell, AuthLink } from '@/components/auth/AuthShell';

/**
 * Página pública de registro (Etapa 3 — Auth real).
 * Registro ABIERTO (spec v4 §3): cualquiera crea cuenta gratis y recibe su propio
 * workspace. Con invitación pendiente se une al workspace que lo invitó.
 * Anti-bot: honeypot `website` + rate limit en el backend. Requiere aceptar
 * Términos y Privacidad. Al aceptar, el usuario inicia sesión en /login.
 */
export default function RegistroPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot: humanos no lo ven
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName: displayName || undefined,
          businessName: businessName.trim() || undefined,
          acceptTerms,
          website,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || 'Error al crear la cuenta');
      } else {
        setOk(true);
      }
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Gratis para empezar. Sin tarjeta."
      footer={
        <>
          ¿Ya tienes cuenta? <AuthLink href="/login">Inicia sesión</AuthLink>
        </>
      }
    >
      {ok ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--rai-success)', marginBottom: 16 }}>
            Cuenta creada correctamente.
          </p>
          <a href="/login" className="btn btn-primary" style={{ width: '100%' }}>
            Ir a iniciar sesión
          </a>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label>Nombre (opcional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Cómo te llaman en el equipo"
              autoComplete="name"
            />
          </div>
          <div className="form-group">
            <label>Tu negocio (opcional)</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Nombre de tu marca o empresa"
              autoComplete="organization"
              maxLength={120}
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="auth-hp" aria-hidden="true">
            <label htmlFor="reg-website">Sitio web</label>
            <input
              id="reg-website"
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <label className="auth-accept">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              required
            />
            <span>
              Acepto los <Link href="/terminos" target="_blank">Términos</Link> y la{' '}
              <Link href="/privacidad" target="_blank">Política de privacidad</Link>.
            </span>
          </label>
          {error && (
            <p style={{ color: 'var(--rai-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={busy || !email.trim() || password.length < 8 || !acceptTerms}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin" size={14} /> Creando cuenta...
              </>
            ) : (
              <>
                <UserPlus size={14} /> Crear cuenta
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}