'use client';

import { useEffect, useState } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { AuthShell, AuthLink } from '@/components/auth/AuthShell';

/**
 * Página pública de login (Etapa 3 — Auth real).
 * POST /api/auth/login → cookie httpOnly `rai_session` → redirect a /.
 * Si ya hay sesión activa, redirige directo.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { credentials: 'same-origin' })
      .then((res) => {
        if (!cancelled && res.ok) window.location.href = '/';
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || 'Error al iniciar sesión');
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Accede a tu workspace del CRM RAI Agency."
      footer={
        <>
          ¿No tienes cuenta? <AuthLink href="/registro">Regístrate</AuthLink> (solo con invitación)
        </>
      }
    >
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
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <p style={{ color: 'var(--rai-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={busy || !email.trim() || !password}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Ingresando...
            </>
          ) : (
            <>
              <LogIn size={14} /> Iniciar sesión
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}