'use client';

import { useEffect, useState } from 'react';
import { LogIn, Loader2, Check } from 'lucide-react';
import { AuthShell, AuthLink } from '@/components/auth/AuthShell';
import { safeNext } from '@/lib/safe-next';

const REMEMBER_KEY = 'rai-login-remember';

/** Destino tras iniciar sesión: `?next=` del middleware, solo si es ruta interna; si no, el inicio. */
function nextTarget(): string {
  return safeNext(new URLSearchParams(window.location.search).get('next'));
}

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
  const [remember, setRemember] = useState(true); // por defecto ON: sesión de 30 días

  // Recordar la última elección del toggle en este navegador (solo comodidad de UI).
  useEffect(() => {
    try {
      // Por defecto activado; solo se desactiva si el usuario lo apagó antes ('0').
      if (window.localStorage.getItem(REMEMBER_KEY) === '0') setRemember(false);
    } catch {
      /* storage bloqueado: se queda en false */
    }
  }, []);

  function toggleRemember(next: boolean) {
    setRemember(next);
    try {
      window.localStorage.setItem(REMEMBER_KEY, next ? '1' : '0');
    } catch {
      /* ignorar */
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { credentials: 'same-origin' })
      .then((res) => {
        if (!cancelled && res.ok) window.location.href = nextTarget();
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
        body: JSON.stringify({ email, password, rememberMe: remember }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || 'Error al iniciar sesión');
      } else {
        window.location.href = nextTarget();
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
          ¿No tienes cuenta? <AuthLink href="/registro">Regístrate gratis</AuthLink>
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
          <div className="auth-forgot">
            <AuthLink href="/recuperar">¿Olvidaste tu contraseña?</AuthLink>
          </div>
        </div>
        <label className="remember-toggle" htmlFor="login-remember" data-checked={remember}>
          <input
            id="login-remember"
            type="checkbox"
            role="switch"
            className="remember-input"
            checked={remember}
            onChange={(e) => toggleRemember(e.target.checked)}
          />
          <span className="remember-text">
            <span className="remember-title">Mantener sesión iniciada</span>
            <span className="remember-sub">
              {remember
                ? 'No te pediremos la clave por 30 días en este equipo.'
                : 'Se cierra al cerrar el navegador.'}
            </span>
          </span>
          <span className="remember-track" aria-hidden="true">
            <span className="remember-thumb">
              <Check size={12} strokeWidth={3.5} />
            </span>
          </span>
        </label>
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