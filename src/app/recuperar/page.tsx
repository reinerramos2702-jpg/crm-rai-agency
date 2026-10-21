'use client';

import { useState } from 'react';
import { Send, Loader2, Mail, Phone } from 'lucide-react';
import { AuthShell, AuthLink } from '@/components/auth/AuthShell';

/**
 * Recuperar contraseña: el usuario elige correo o teléfono y recibe un enlace de un solo uso.
 * La respuesta del servidor es siempre genérica (no revela si la cuenta existe).
 */
export default function RecuperarPage() {
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: value }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setError(d.error || 'No se pudo enviar. Intenta de nuevo.');
      else setSent(true);
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para crear una nueva."
      footer={
        <>
          ¿La recordaste? <AuthLink href="/login">Volver a iniciar sesión</AuthLink>
        </>
      }
    >
      {sent ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--rai-success)', marginBottom: 8 }}>
            Si la cuenta existe, te enviamos instrucciones.
          </p>
          <p style={{ fontSize: 12.5, color: '#a9a9c4', marginBottom: 16 }}>
            El enlace vence en 30 minutos. Revisa también tu carpeta de spam.
          </p>
          <a href="/login" className="btn btn-primary" style={{ width: '100%' }}>
            Volver a iniciar sesión
          </a>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="auth-seg" role="tablist" aria-label="Método de recuperación">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'email'}
              className={mode === 'email' ? 'is-on' : ''}
              onClick={() => {
                setMode('email');
                setValue('');
                setError('');
              }}
            >
              <Mail size={14} /> Correo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'phone'}
              className={mode === 'phone' ? 'is-on' : ''}
              onClick={() => {
                setMode('phone');
                setValue('');
                setError('');
              }}
            >
              <Phone size={14} /> Teléfono
            </button>
          </div>
          <div className="form-group">
            <label>{mode === 'email' ? 'Email' : 'Teléfono (con código de país)'}</label>
            <input
              type={mode === 'email' ? 'email' : 'tel'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === 'email' ? 'tu@email.com' : '+58 412 1234567'}
              autoComplete={mode === 'email' ? 'email' : 'tel'}
              required
            />
          </div>
          {error && (
            <p style={{ color: 'var(--rai-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin" size={14} /> Enviando...
              </>
            ) : (
              <>
                <Send size={14} /> Enviar enlace
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
