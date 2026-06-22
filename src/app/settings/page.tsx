'use client';

import React, { useEffect, useState } from 'react';
import { Settings2, Webhook, Globe, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle, Users, UserPlus, Trash2, Crown, Sun, Moon } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type Role } from '@/lib/roles-shared';

interface SettingsData {
  n8nWebhookUrl?: string;
  igBusinessId?: string;
}

interface TeamMember {
  id: string;
  email: string;
  role: Role;
  status: 'invited' | 'active' | 'suspended';
  displayName: string | null;
  createdAt: string;
}

interface TeamOwner {
  id: string;
  email: string;
  displayName: string | null;
}

const INVITABLE_ROLES = ROLES.filter((r) => r !== 'admin') as Exclude<Role, 'admin'>[];

/**
 * Página de Configuración.
 * - URL del Webhook n8n
 * - Instagram Business Account ID
 * - Toggle modo dev / producción
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingN8n, setTestingN8n] = useState(false);
  const [devMode, setDevMode] = useState(true);
  const [n8nStatus, setN8nStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Estado del formulario
  const [n8nUrl, setN8nUrl] = useState('');
  const [igBusinessId, setIgBusinessId] = useState('');
  const [igToken, setIgToken] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('rai-theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('rai-theme', next);
    toast.success(next === 'light' ? 'Modo claro activado' : 'Modo oscuro activado');
  }

  // Equipo y roles
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [teamOwner, setTeamOwner] = useState<TeamOwner | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<Role, 'admin'>>('agente');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadSettings();
    loadMe();
  }, []);

  async function loadMe() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) return;
      const data = await res.json();
      setMyRole(data.role as Role);
      if (data.role === 'admin') loadTeam();
    } catch {
      /* silencioso */
    }
  }

  async function loadTeam() {
    setLoadingTeam(true);
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setTeamOwner(data.owner ?? null);
        setTeamMembers(data.members ?? []);
      }
    } catch {
      toast.error('Error cargando el equipo');
    } finally {
      setLoadingTeam(false);
    }
  }

  async function inviteMember() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast.error('Escribe un email válido');
      return;
    }
    setInviting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      if (res.ok) {
        toast.success('Miembro invitado');
        setInviteEmail('');
        await loadTeam();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Error invitando al miembro');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setInviting(false);
    }
  }

  async function updateMemberRole(id: string, role: Role) {
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        toast.success('Rol actualizado');
        await loadTeam();
      } else {
        toast.error('Error actualizando el rol');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  async function toggleMemberStatus(member: TeamMember) {
    const next = member.status === 'suspended' ? 'active' : 'suspended';
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        toast.success(next === 'suspended' ? 'Miembro suspendido' : 'Miembro reactivado');
        await loadTeam();
      } else {
        toast.error('Error actualizando el estado');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  async function removeMember(id: string) {
    if (!confirm('¿Eliminar a este miembro del equipo?')) return;
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Miembro eliminado');
        await loadTeam();
      } else {
        toast.error('Error eliminando al miembro');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
        setN8nUrl(data.settings?.n8nWebhookUrl || '');
        setIgBusinessId(data.settings?.igBusinessId || '');
      }
    } catch {
      toast.error('Error cargando configuración');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n8nWebhookUrl: n8nUrl, igBusinessId }),
      });
      if (res.ok) {
        toast.success('Configuración guardada');
        await loadSettings();
      } else {
        toast.error('Error guardando configuración');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setSaving(false);
    }
  }

  async function testN8nConnection() {
    if (!n8nUrl) {
      toast.error('Escribe la URL del webhook primero');
      return;
    }
    setTestingN8n(true);
    setN8nStatus('idle');
    try {
      const res = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test.ping', source: 'rai-content-engine', timestamp: new Date().toISOString() }),
      });
      if (res.ok) {
        setN8nStatus('success');
        toast.success('n8n respondió correctamente ✅');
      } else {
        setN8nStatus('error');
        toast.error(`n8n respondió con error ${res.status}`);
      }
    } catch {
      setN8nStatus('error');
      toast.error('No se pudo conectar al webhook de n8n');
    } finally {
      setTestingN8n(false);
    }
  }

  async function saveInstagramToken() {
    if (!igToken.trim()) {
      toast.error('Escribe el access token de Instagram');
      return;
    }
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'instagram', key: igToken }),
      });
      if (res.ok) {
        toast.success('Token de Instagram guardado y encriptado');
        setIgToken('');
      } else {
        toast.error('Error guardando token');
      }
    } catch {
      toast.error('Error de red');
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <TopBar
        title="Configuración"
        subtitle="Webhook n8n, Instagram y modo de ejecución"
        actions={
          <button onClick={saveSettings} disabled={saving} className="btn btn-primary">
            {saving ? <Spinner size="sm" /> : <Settings2 size={14} />}
            Guardar cambios
          </button>
        }
      />

      <div className="container-sm" style={{ paddingTop: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Apariencia — Modo claro / oscuro */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {theme === 'dark' ? <Moon size={16} color="var(--rai-gold)" /> : <Sun size={16} color="var(--rai-gold)" />}
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>Apariencia</h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {theme === 'dark' ? 'Modo oscuro (Cosmic)' : 'Modo claro (Perla)'}
                </div>
                <p style={{ fontSize: 12, color: 'var(--rai-muted)', marginTop: 4 }}>
                  {theme === 'dark'
                    ? 'Interfaz oscura con acentos dorados. Ideal para trabajo nocturno.'
                    : 'Interfaz clara con tonos perla #EAE0C8. Elegante y luminosa.'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--rai-border)',
                  background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: 'var(--rai-text)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                {theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              </button>
            </div>
          </div>

          {/* Equipo y roles (solo admin) */}
          {myRole === 'admin' && (
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={16} color="var(--rai-gold)" />
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>Equipo y roles</h3>
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--rai-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                Invita miembros a tu workspace y asígnales un rol. Cada rol controla qué módulos
                pueden ver y si pueden crear, editar o eliminar información.
              </p>

              {loadingTeam ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  <table className="table" style={{ marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Miembro</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th style={{ width: 60 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamOwner && (
                        <tr>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Crown size={14} color="var(--rai-gold)" />
                              <div>
                                <div style={{ fontWeight: 600 }}>{teamOwner.displayName || teamOwner.email}</div>
                                <div className="muted" style={{ fontSize: 11 }}>{teamOwner.email}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="badge badge-gold">Administrador</span></td>
                          <td><span className="badge badge-success">Activo</span></td>
                          <td></td>
                        </tr>
                      )}
                      {teamMembers.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{m.displayName || m.email}</div>
                            <div className="muted" style={{ fontSize: 11 }}>{m.email}</div>
                          </td>
                          <td>
                            <select
                              value={m.role}
                              onChange={(e) => updateMemberRole(m.id, e.target.value as Role)}
                              style={{ fontSize: 12 }}
                            >
                              {INVITABLE_ROLES.map((r) => (
                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {m.status === 'active' && <span className="badge badge-success">Activo</span>}
                            {m.status === 'invited' && <span className="badge badge-warning">Invitado</span>}
                            {m.status === 'suspended' && <span className="badge badge-muted">Suspendido</span>}
                          </td>
                          <td>
                            <div className="row" style={{ gap: 8 }}>
                              <button
                                className="btn-sm ghost"
                                onClick={() => toggleMemberStatus(m)}
                                title={m.status === 'suspended' ? 'Reactivar' : 'Suspender'}
                              >
                                {m.status === 'suspended' ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                              </button>
                              <span title="Eliminar" style={{ display: 'flex' }}>
                                <Trash2
                                  size={14}
                                  style={{ cursor: 'pointer', color: 'var(--rai-error)' }}
                                  onClick={() => removeMember(m.id)}
                                />
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {teamMembers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 16 }}>
                            Aún no has invitado a nadie a este workspace.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                      <label>Email del nuevo miembro</label>
                      <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="persona@empresa.com"
                        type="email"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Rol</label>
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Exclude<Role, 'admin'>)}>
                        {INVITABLE_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn btn-secondary" onClick={inviteMember} disabled={inviting}>
                      {inviting ? <Spinner size="sm" /> : <UserPlus size={14} />}
                      Invitar
                    </button>
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ROLES.map((r) => (
                      <p key={r} style={{ fontSize: 11, color: 'var(--rai-muted)', lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--rai-text)' }}>{ROLE_LABELS[r]}:</strong> {ROLE_DESCRIPTIONS[r]}
                      </p>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* n8n Webhook */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Webhook size={16} color="var(--rai-gold)" />
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>Webhook n8n</h3>
              </div>
              {n8nStatus === 'success' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={14} color="var(--rai-success)" />
                  <span style={{ fontSize: 12, color: 'var(--rai-success)' }}>Conectado</span>
                </div>
              )}
              {n8nStatus === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={14} color="var(--rai-error)" />
                  <span style={{ fontSize: 12, color: 'var(--rai-error)' }}>Error de conexión</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>URL del Webhook</label>
              <input
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="https://raiagency.app.n8n.cloud/webhook/rai-content"
                type="url"
              />
              <p style={{ fontSize: 11, color: 'var(--rai-muted)', marginTop: 6, lineHeight: 1.5 }}>
                n8n recibirá los assets completados y decidirá si publicar en Instagram o enviar notificación push.
              </p>
            </div>

            <button
              onClick={testN8nConnection}
              disabled={!n8nUrl || testingN8n}
              className="btn btn-secondary btn-sm"
            >
              {testingN8n ? <Spinner size="sm" /> : <Webhook size={12} />}
              Probar conexión n8n
            </button>
          </div>

          {/* Instagram */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={16} color="var(--rai-gold)" />
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>Instagram Business</h3>
              </div>
            </div>

            <div className="form-group">
              <label>Business Account ID</label>
              <input
                value={igBusinessId}
                onChange={(e) => setIgBusinessId(e.target.value)}
                placeholder="17841400000000000"
              />
              <p style={{ fontSize: 11, color: 'var(--rai-muted)', marginTop: 6 }}>
                Encuéntralo en Meta Business Suite → Configuración de la cuenta
              </p>
            </div>

            <div className="form-group">
              <label>Access Token de Instagram (BYOK — se encripta)</label>
              <input
                value={igToken}
                onChange={(e) => setIgToken(e.target.value)}
                placeholder="EAAxxxxx..."
                type="password"
              />
            </div>

            <button
              onClick={saveInstagramToken}
              disabled={!igToken.trim()}
              className="btn btn-secondary btn-sm"
            >
              <Globe size={12} />
              Guardar token (encriptado)
            </button>
          </div>

          {/* Modo Dev / Producción */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Modo de Ejecución</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--rai-text)', marginBottom: 4 }}>
                  Modo Desarrollo
                </p>
                <p style={{ fontSize: 12, color: 'var(--rai-muted)' }}>
                  Auth bypass activo. Cambia DEV_BYPASS_AUTH en .env.local para producción.
                </p>
              </div>
              <button
                onClick={() => setDevMode(!devMode)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: devMode ? 'var(--rai-warning)' : 'var(--rai-success)',
                }}
              >
                {devMode ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
              </button>
            </div>

            <div
              style={{
                padding: '10px 14px',
                background: devMode ? 'rgba(255,159,28,0.08)' : 'rgba(46,196,182,0.08)',
                border: `1px solid ${devMode ? 'rgba(255,159,28,0.2)' : 'rgba(46,196,182,0.2)'}`,
                borderRadius: 8,
                fontSize: 12,
                color: devMode ? 'var(--rai-warning)' : 'var(--rai-success)',
              }}
            >
              {devMode
                ? '⚠️ Modo DEV activo — sin autenticación real. No usar en producción.'
                : '✅ Modo PRODUCCIÓN — autenticación JWT completa.'}
            </div>
          </div>

          {/* Variable de entorno de info */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Variables de Entorno</h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--rai-muted)', lineHeight: 1.7 }}>
              Configura las siguientes variables en <code style={{ color: 'var(--rai-gold)' }}>.env.local</code>:
            </p>
            <div
              className="terminal"
              style={{ marginTop: 12, fontSize: 11 }}
            >
              {[
                'DATABASE_URL=postgresql://...',
                'DIRECT_URL=postgresql://...',
                'UPSTASH_REDIS_REST_URL=https://...',
                'UPSTASH_REDIS_REST_TOKEN=...',
                'R2_ACCOUNT_ID=...',
                'R2_ACCESS_KEY_ID=...',
                'R2_SECRET_ACCESS_KEY=...',
                'R2_BUCKET=rai-content-engine',
                'R2_PUBLIC_URL=https://pub-xxx.r2.dev',
                'JWT_SECRET=...',
                'KEYS_ENCRYPTION_KEY=...',
                'DEV_BYPASS_AUTH=true',
                'HARD_CAP_USD_PER_EXECUTION=50',
              ].map((v) => (
                <div key={v} className="terminal-line info">{v}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
