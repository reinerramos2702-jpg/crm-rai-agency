'use client';

import { useEffect, useState } from 'react';
import { Key, Plus, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI (GPT-4, gpt-image-1, TTS)', group: 'Modelos' },
  { id: 'anthropic', label: 'Anthropic (Claude 3.5/4)', group: 'Modelos' },
  { id: 'google', label: 'Google (Gemini, Veo 2, Imagen 3)', group: 'Modelos' },
  { id: 'deepseek', label: 'DeepSeek (copy barato)', group: 'Modelos' },
  { id: 'elevenlabs', label: 'ElevenLabs (TTS voces)', group: 'Servicios' },
  { id: 'suno', label: 'Suno (música IA)', group: 'Servicios' },
  { id: 'instagram', label: 'Instagram Graph API (publicación)', group: 'Publicación' },
];

interface ApiKeyRecord {
  id: string;
  provider: string;
  label?: string;
  validated: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

/**
 * Página de Claves de IA (BYOK).
 * UI mejorada con paleta RAI.
 */
export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/keys');
      const d = await r.json();
      setKeys(d.keys || []);
    } catch {
      toast.error('Error cargando keys');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!apiKey.trim()) return;
    setBusy(true);
    try {
      const r = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, label: label || undefined }),
      });
      if (!r.ok) {
        const err = await r.json();
        toast.error(err.error || 'Error guardando key');
      } else {
        toast.success('Key guardada y encriptada ✅');
        setApiKey('');
        setLabel('');
        await load();
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta API key?')) return;
    try {
      const r = await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
      if (r.ok) {
        toast.success('Key eliminada');
        setKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch {
      toast.error('Error eliminando');
    }
  }

  // Agrupar por proveedor
  const groupedProviders = PROVIDERS.reduce<Record<string, typeof PROVIDERS>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  return (
    <>
      <TopBar
        title="Claves de IA"
        subtitle="Gestiona tus API keys (BYOK — encriptadas con AES-256-GCM)"
      />

      <div className="container-sm" style={{ paddingTop: 32 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* Panel izquierdo: Agregar key */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: '1px solid var(--rai-border)',
              }}
            >
              <Plus size={14} color="var(--rai-gold)" />
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Agregar API Key</h3>
            </div>

            <div className="form-group">
              <label>Proveedor</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                {Object.entries(groupedProviders).map(([group, items]) => (
                  <optgroup key={group} label={group}>
                    {items.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-... / EAAx..."
                onKeyDown={(e) => e.key === 'Enter' && save()}
              />
            </div>

            <div className="form-group">
              <label>Label (opcional)</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="producción / personal / cliente"
              />
            </div>

            <button
              onClick={save}
              disabled={busy || !apiKey.trim()}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {busy ? (
                <><Spinner size="sm" /> Validando y guardando...</>
              ) : (
                <><Key size={14} /> Guardar y validar</>
              )}
            </button>

            <div
              style={{
                marginTop: 16,
                padding: '10px 12px',
                background: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: 8,
              }}
            >
              <p style={{ fontSize: 11, color: 'var(--rai-muted)', lineHeight: 1.7 }}>
                🔒 Las keys se encriptan con <strong style={{ color: 'var(--rai-text)' }}>AES-256-GCM</strong> antes de guardarse.
                Las claves de LLM se validan con un test-call rápido.
                Las keys de servicios externos se guardan sin validar.
              </p>
            </div>
          </div>

          {/* Panel derecho: Keys configuradas */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--rai-text)' }}>
              Keys configuradas
            </h3>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Spinner />
              </div>
            ) : keys.length === 0 ? (
              <div
                style={{
                  padding: '32px 24px',
                  textAlign: 'center',
                  background: 'var(--rai-card)',
                  borderRadius: 12,
                  border: '1px solid var(--rai-border)',
                }}
              >
                <Key size={28} color="var(--rai-muted)" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--rai-muted)', fontSize: 14 }}>
                  Sin keys configuradas aún.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="card"
                    style={{ padding: '14px 16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: k.validated ? 'rgba(46,196,182,0.1)' : 'rgba(255,159,28,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {k.validated ? (
                            <CheckCircle2 size={14} color="var(--rai-success)" />
                          ) : (
                            <AlertTriangle size={14} color="var(--rai-warning)" />
                          )}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--rai-text)' }}>
                            {k.provider}
                            {k.label && (
                              <span style={{ fontSize: 11, color: 'var(--rai-muted)', fontWeight: 400, marginLeft: 6 }}>
                                · {k.label}
                              </span>
                            )}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--rai-muted)', marginTop: 1 }}>
                            {k.validated ? '✓ Validada' : '⚠ Sin validar'} · Creada {new Date(k.createdAt).toLocaleDateString('es')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => remove(k.id)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 8px' }}
                        title="Eliminar key"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {k.lastUsedAt && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                        <Clock size={10} color="var(--rai-muted)" />
                        <span style={{ fontSize: 10, color: 'var(--rai-muted)' }}>
                          Último uso: {new Date(k.lastUsedAt).toLocaleString('es')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
