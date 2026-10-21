'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { checkNotifyEmail } from '@/lib/automation-settings';
import { errorMessage } from '../api';
import type { SettingsT } from '../types';
import '../settings.css';

interface NotifyCardProps {
  settings: SettingsT | null;
  save: (patch: Partial<SettingsT>) => Promise<void>;
}

export function NotifyCard({ settings, save }: NotifyCardProps) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasSettings = settings !== null;
  const savedEmail = settings?.automationNotifyEmail ?? '';
  useEffect(() => {
    if (hasSettings) setEmail(savedEmail);
  }, [hasSettings, savedEmail]);

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(t);
  }, [saved]);

  const check = checkNotifyEmail(email);
  const error = touched && !check.ok ? check.error : null;
  const changed = check.ok ? (check.value ?? '') !== savedEmail : email.trim() !== savedEmail;

  async function submit() {
    setTouched(true);
    if (!check.ok) return;
    setSaving(true);
    try {
      await save({ automationNotifyEmail: check.value });
      toast.success(check.value ? 'Correo de avisos guardado.' : 'Correo de avisos quitado.');
      setSaved(true);
    } catch (e: unknown) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="st-card">
      <h3 className="st-card-title"><Bell size={16} /> Correo de avisos internos</h3>
      <p className="st-card-text">
        Dirección de referencia para los avisos cuando un flujo falla. El envío automático por correo todavía no está
        activo: hoy sirve para tus webhooks de notificación y queda guardada para cuando lo esté.
      </p>
      <form
        className="st-inline"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          type="email"
          placeholder="gerencia@tuempresa.com"
          aria-label="Correo de avisos"
          aria-invalid={!!error}
          aria-describedby={error ? 'st-email-error' : undefined}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        <button type="submit" className="au-btn au-btn--soft" disabled={saving || !changed || !!error}>
          {saving ? <Loader2 size={14} className="au-spin" /> : null} {check.ok && check.value === null && savedEmail ? 'Quitar' : 'Guardar'}
        </button>
      </form>
      {error && <p id="st-email-error" className="st-field-error" role="alert">{error}</p>}
      {saved && !error && <p className="st-saved" role="status"><CheckCircle2 size={13} aria-hidden="true" /> Guardado</p>}
    </div>
  );
}
