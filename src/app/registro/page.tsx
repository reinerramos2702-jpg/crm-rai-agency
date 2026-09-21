'use client';

import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { AuthShell, AuthLink } from '@/components/auth/AuthShell';

/**
 * Página pública de registro (Etapa 3 — Auth real).
 * Registro SOLO por invitación: POST /api/auth/register rechaza con 403 si el
 * email no tiene una invitación pendiente de equipo (o no es super admin).
 * Al aceptar, redirige a /login para iniciar sesión.
 */
export default function RegistroPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
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
        body: JSON.stringify({ email, password, displayName: displayName || undefined }),
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
      subtitle="El registro es solo por invitación de un administrador del workspace."
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
          {error && (
            <p style={{ color: 'var(--rai-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={busy || !email.trim() || password.length < 8}
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