'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import { AuthShell, AuthLink } from '@/components/auth/AuthShell';

function RestablecerForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setError(d.error || 'No se pudo restablecer la contraseña.');
      else setOk(true);
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--rai-error)', marginBottom: 16 }}>
          Enlace no válido o incompleto.
        </p>
        <a href="/recuperar" className="btn btn-primary" style={{ width: '100%' }}>
          Solicitar un enlace nuevo
        </a>
      </div>
    );
  }
  if (ok) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--rai-success)', marginBottom: 16 }}>
          Contraseña actualizada.
        </p>
        <a href="/login" className="btn btn-primary" style={{ width: '100%' }}>
          Iniciar sesión
        </a>
      </div>
    );
  }
  return (
    <form onSubmit={submit}>
      <div className="form-group">
        <label>Nueva contraseña</label>
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
      <div className="form-group">
        <label>Repetir contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repite la contraseña"
          autoComplete="new-password"
          required
        />
        {mismatch && (
          <p style={{ color: 'var(--rai-error)', fontSize: 12, marginTop: 6 }}>
            Las contraseñas no coinciden.
          </p>
        )}
      </div>
      {error && <p style={{ color: 'var(--rai-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <button
        type="submit"
        disabled={busy || password.length < 8 || password !== confirm}
        className="btn btn-primary"
        style={{ width: '100%' }}
      >
        {busy ? (
          <>
            <Loader2 className="animate-spin" size={14} /> Guardando...
          </>
        ) : (
          <>
            <KeyRound size={14} /> Guardar contraseña
          </>
        )}
      </button>
    </form>
  );
}

export default function RestablecerPage() {
  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Elige una contraseña segura para tu cuenta."
      footer={
        <>
          <AuthLink href="/login">Volver a iniciar sesión</AuthLink>
        </>
      }
    >
      <Suspense fallback={null}>
        <RestablecerForm />
      </Suspense>
    </AuthShell>
  );
}
