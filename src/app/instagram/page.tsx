'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Instagram, Send, CalendarClock, KeyRound, Activity, UserCircle2, Plus,
  Trash2, ExternalLink, RefreshCw, Image as ImageIcon, Images, Film,
  CircleDot, MessageCircle, CheckCircle2, XCircle, Clock, Pencil,
  AlertTriangle, Database, Loader2, Layers,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Tipos (espejo de los modelos Prisma — sin importar nada server-only)
// ---------------------------------------------------------------------------

type SocialPost = {
  id: string;
  type: 'image' | 'carousel' | 'reel' | 'story';
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  caption: string;
  mediaUrls: string[];
  coverUrl: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  permalink: string | null;
  errorMessage: string | null;
  attemptCount: number;
  keyword: string | null;
  pillar: string | null;
  createdAt: string;
};

type KeywordRule = {
  id: string;
  keyword: string;
  matchType: 'contains' | 'exact';
  enabled: boolean;
  replyToComment: boolean;
  commentReplies: string[];
  dmEnabled: boolean;
  dmMessage: string;
  dmLink: string | null;
  triggerCount: number;
  lastTriggeredAt: string | null;
};

type ActionLog = {
  id: string;
  kind: string;
  status: string;
  igUsername: string | null;
  detail: string;
  createdAt: string;
};

type AccountInfo = {
  connected: boolean;
  source: 'db' | 'env' | null;
  igUserId: string | null;
  pageId: string | null;
  username: string | null;
  followers: number | null;
  mediaCount: number | null;
  lastError: string | null;
  hasEnvToken: boolean;
};

const TOP_TABS = [
  { id: 'posts', label: 'Publicaciones', icon: CalendarClock },
  { id: 'new', label: 'Nueva publicación', icon: Plus },
  { id: 'keywords', label: 'Palabras clave (DM)', icon: KeyRound },
  { id: 'activity', label: 'Actividad', icon: Activity },
  { id: 'account', label: 'Cuenta', icon: UserCircle2 },
] as const;
type TopTab = (typeof TOP_TABS)[number]['id'];

const TYPE_META: Record<string, { label: string; icon: typeof ImageIcon }> = {
  image: { label: 'Imagen', icon: ImageIcon },
  carousel: { label: 'Carrusel', icon: Images },
  reel: { label: 'Reel', icon: Film },
  story: { label: 'Story', icon: CircleDot },
};

const STATUS_META: Record<string, { label: string; badge: string }> = {
  draft: { label: 'Borrador', badge: 'badge-muted' },
  scheduled: { label: 'Programado', badge: 'badge-gold' },
  publishing: { label: 'Publicando…', badge: 'badge-purple' },
  published: { label: 'Publicado', badge: 'badge-success' },
  failed: { label: 'Falló', badge: 'badge-error' },
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function InstagramPage() {
  const [tab, setTab] = useState<TopTab>('posts');
  const [account, setAccount] = useState<AccountInfo | null>(null);

  const loadAccount = useCallback(async () => {
    try {
      const data = await jsonFetch<AccountInfo>('/api/instagram/account');
      setAccount(data);
    } catch {
      setAccount(null);
    }
  }, []);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  return (
    <div className="container">
      <div className="row-between mb-4">
        <div>
          <h1 className="h1 row" style={{ gap: 10 }}>
            <Instagram size={26} style={{ color: 'var(--rai-gold)' }} />
            Instagram
          </h1>
          <p className="muted">
            Publicación automática de posts, carruseles, reels y stories + DMs por palabra clave.
          </p>
        </div>
        {account && (
          <span className={account.connected ? 'badge-success' : 'badge-warning'}>
            {account.connected ? `Conectado: @${account.username || account.igUserId}` : 'Sin conectar'}
          </span>
        )}
      </div>

      <div className="row" style={{ gap: 4, borderBottom: '1px solid var(--rai-border)', marginBottom: 20, flexWrap: 'wrap' }}>
        {TOP_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              className="ghost"
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                borderRadius: 0,
                borderBottom: active ? '2px solid var(--rai-gold)' : '2px solid transparent',
                color: active ? 'var(--rai-gold)' : 'var(--rai-muted)',
              }}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'posts' && <PostsTab onNew={() => setTab('new')} />}
      {tab === 'new' && <NewPostTab connected={Boolean(account?.connected)} onCreated={() => setTab('posts')} />}
      {tab === 'keywords' && <KeywordsTab />}
      {tab === 'activity' && <ActivityTab />}
      {tab === 'account' && <AccountTab account={account} refresh={loadAccount} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Publicaciones (cola)
// ---------------------------------------------------------------------------

function PostsTab({ onNew }: { onNew: () => void }) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter ? `?status=${filter}` : '';
      const data = await jsonFetch<{ posts: SocialPost[]; byStatus: Record<string, number> }>(`/api/instagram/posts${qs}`);
      setPosts(data.posts);
      setByStatus(data.byStatus);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando publicaciones');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const publishNow = async (id: string) => {
    setBusyId(id);
    const t = toast.loading('Publicando en Instagram…');
    try {
      const data = await jsonFetch<{ post: SocialPost }>(`/api/instagram/posts/${id}/publish`, { method: 'POST' });
      toast.success(data.post.permalink ? 'Publicado ✔' : 'Publicado en Instagram ✔', { id: t });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error publicando', { id: t, duration: 6000 });
      load();
    } finally {
      setBusyId('');
    }
  };

  const reschedule = async (post: SocialPost) => {
    const current = post.scheduledAt ? new Date(post.scheduledAt) : new Date(Date.now() + 3600_000);
    const local = new Date(current.getTime() - current.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const input = window.prompt('Nueva fecha/hora (formato AAAA-MM-DDTHH:MM, hora local):', local);
    if (!input) return;
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) { toast.error('Fecha inválida'); return; }
    try {
      await jsonFetch(`/api/instagram/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: d.toISOString() }),
      });
      toast.success('Reprogramado');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar esta publicación de la cola? (no borra nada de Instagram)')) return;
    try {
      await jsonFetch(`/api/instagram/posts/${id}`, { method: 'DELETE' });
      toast.success('Eliminada');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const chips = [
    { id: '', label: `Todas (${Object.values(byStatus).reduce((a, b) => a + b, 0)})` },
    { id: 'scheduled', label: `Programadas (${byStatus.scheduled || 0})` },
    { id: 'draft', label: `Borradores (${byStatus.draft || 0})` },
    { id: 'published', label: `Publicadas (${byStatus.published || 0})` },
    { id: 'failed', label: `Fallidas (${byStatus.failed || 0})` },
  ];

  return (
    <div>
      <div className="row-between mb-4" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {chips.map((c) => (
            <button
              key={c.id}
              className={filter === c.id ? 'primary btn-sm' : 'secondary btn-sm'}
              onClick={() => setFilter(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary btn-sm" onClick={load}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="primary btn-sm" onClick={onNew}>
            <Plus size={14} /> Nueva publicación
          </button>
        </div>
      </div>

      {posts.length === 0 && !loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <CalendarClock size={40} style={{ color: 'var(--rai-gold)', margin: '0 auto 12px' }} />
          <h3 className="h3">Aún no tienes publicaciones en cola</h3>
          <p className="muted mb-4">Crea tu primera publicación y prográmala. El sistema la publica solo.</p>
          <button className="primary" onClick={onNew}><Plus size={16} /> Crear la primera</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table w-full">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Caption</th>
                <th>Medias</th>
                <th>Programado para</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const T = TYPE_META[p.type] || TYPE_META.image;
                const S = STATUS_META[p.status] || STATUS_META.draft;
                const Icon = T.icon;
                return (
                  <tr key={p.id}>
                    <td><span className="row" style={{ gap: 6 }}><Icon size={15} style={{ color: 'var(--rai-gold)' }} />{T.label}</span></td>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.caption || <span className="muted">(sin caption)</span>}
                      </div>
                      {p.keyword && <span className="badge-purple" style={{ fontSize: 11 }}>CTA: {p.keyword}</span>}
                      {p.errorMessage && p.status === 'failed' && (
                        <div className="muted" style={{ color: 'var(--rai-error)', fontSize: 12, marginTop: 4 }}>
                          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {p.errorMessage.slice(0, 120)}
                        </div>
                      )}
                    </td>
                    <td>{p.mediaUrls.length}</td>
                    <td>
                      {p.status === 'published' ? fmtDate(p.publishedAt) : fmtDate(p.scheduledAt)}
                    </td>
                    <td><span className={S.badge}>{S.label}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {p.permalink && (
                        <a href={p.permalink} target="_blank" rel="noreferrer" className="ghost btn-icon" title="Ver en Instagram">
                          <ExternalLink size={15} />
                        </a>
                      )}
                      {p.status !== 'published' && p.status !== 'publishing' && (
                        <>
                          <button className="ghost btn-icon" title="Reprogramar" onClick={() => reschedule(p)}>
                            <Clock size={15} />
                          </button>
                          <button
                            className="ghost btn-icon"
                            title="Publicar ahora"
                            disabled={busyId === p.id}
                            onClick={() => publishNow(p.id)}
                          >
                            {busyId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                          </button>
                          <button className="ghost btn-icon" title="Eliminar" onClick={() => remove(p.id)}>
                            <Trash2 size={15} style={{ color: 'var(--rai-error)' }} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Nueva publicación
// ---------------------------------------------------------------------------

function NewPostTab({ connected, onCreated }: { connected: boolean; onCreated: () => void }) {
  const [type, setType] = useState<'image' | 'carousel' | 'reel' | 'story'>('image');
  const [urlsText, setUrlsText] = useState('');
  const [caption, setCaption] = useState('');
  const [keyword, setKeyword] = useState('');
  const [pillar, setPillar] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState<'' | 'draft' | 'schedule' | 'now'>('');

  const urls = useMemo(
    () => urlsText.split('\n').map((s) => s.trim()).filter(Boolean),
    [urlsText]
  );

  const submit = async (mode: 'draft' | 'schedule' | 'now') => {
    if (urls.length === 0) { toast.error('Agrega al menos una URL pública de imagen/video'); return; }
    if (type === 'carousel' && (urls.length < 2 || urls.length > 10)) {
      toast.error('Un carrusel necesita entre 2 y 10 medias'); return;
    }
    if (mode === 'schedule' && !scheduledAt) { toast.error('Elige fecha y hora'); return; }

    setSaving(mode);
    const t = toast.loading(mode === 'now' ? 'Publicando…' : 'Guardando…');
    try {
      const body: Record<string, unknown> = {
        type, caption, mediaUrls: urls,
        keyword: keyword || null, pillar: pillar || null,
      };
      if (mode === 'schedule') body.scheduledAt = new Date(scheduledAt).toISOString();

      const data = await jsonFetch<{ post: SocialPost }>('/api/instagram/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (mode === 'now') {
        const pub = await jsonFetch<{ post: SocialPost }>(`/api/instagram/posts/${data.post.id}/publish`, { method: 'POST' });
        toast.success(pub.post.permalink ? 'Publicado en Instagram ✔' : 'Publicado ✔', { id: t });
      } else {
        toast.success(mode === 'schedule' ? 'Programado ✔' : 'Borrador guardado', { id: t });
      }
      setUrlsText(''); setCaption(''); setKeyword(''); setPillar(''); setScheduledAt('');
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error', { id: t, duration: 7000 });
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start', gap: 20 }}>
      <div className="card">
        <h3 className="h3 mb-4">Contenido</h3>

        <div className="form-group">
          <label className="label">Tipo de publicación</label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
              const Icon = TYPE_META[k].icon;
              return (
                <button
                  key={k}
                  className={type === k ? 'primary btn-sm' : 'secondary btn-sm'}
                  onClick={() => setType(k as typeof type)}
                >
                  <Icon size={14} /> {TYPE_META[k].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="label">
            URLs de {type === 'reel' ? 'video (.mp4)' : 'imágenes (.jpg)'} — una por línea
            {type === 'carousel' && ' (2 a 10)'}
          </label>
          <textarea
            className="input w-full"
            rows={type === 'carousel' ? 6 : 3}
            placeholder={'https://…/imagen1.jpg\nhttps://…/imagen2.jpg'}
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
          />
          <p className="muted" style={{ fontSize: 12 }}>
            Deben ser URLs públicas (Instagram las descarga). Sube tus diseños a Canva → Compartir → enlace público de imagen, o a cualquier hosting.
          </p>
        </div>

        {type !== 'story' && (
          <div className="form-group">
            <label className="label">Caption ({caption.length}/2200)</label>
            <textarea
              className="input w-full"
              rows={6}
              maxLength={2200}
              placeholder={'Texto del post…\n\nComenta "CRM" y te envío la guía 👇'}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        )}

        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group">
            <label className="label">Palabra clave CTA (opcional)</label>
            <input className="input w-full" placeholder="CRM" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Pilar de contenido (opcional)</label>
            <input className="input w-full" placeholder="Autoridad / Educar / Vender…" value={pillar} onChange={(e) => setPillar(e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <div className="card mb-4">
          <h3 className="h3 mb-4">Programación</h3>
          <div className="form-group">
            <label className="label">Fecha y hora (tu hora local)</label>
            <input
              type="datetime-local"
              className="input w-full"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="secondary" disabled={saving !== ''} onClick={() => submit('draft')}>
              {saving === 'draft' ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />} Guardar borrador
            </button>
            <button className="primary" disabled={saving !== ''} onClick={() => submit('schedule')}>
              {saving === 'schedule' ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />} Programar
            </button>
            <button className="primary" disabled={saving !== '' || !connected} onClick={() => submit('now')} title={!connected ? 'Conecta la cuenta primero (tab Cuenta)' : ''}>
              {saving === 'now' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Publicar ahora
            </button>
          </div>
          {!connected && (
            <p className="muted mt-4" style={{ fontSize: 12 }}>
              <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: -2, color: 'var(--rai-warning)' }} />{' '}
              Sin cuenta conectada puedes guardar borradores y programar; se publicarán cuando conectes Instagram.
            </p>
          )}
        </div>

        {urls.length > 0 && (
          <div className="card">
            <h3 className="h3 mb-4">Vista previa ({urls.length})</h3>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {urls.slice(0, 10).map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={u}
                  alt={`media ${i + 1}`}
                  style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--rai-border)' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.25'; }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Palabras clave (DM automation)
// ---------------------------------------------------------------------------

const EMPTY_RULE = {
  keyword: '', matchType: 'contains' as 'contains' | 'exact',
  commentRepliesText: 'Te lo acabo de enviar por DM 📩 ¡Revisa tus mensajes!',
  dmMessage: '', dmLink: '', replyToComment: true, dmEnabled: true,
};

function KeywordsTab() {
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_RULE });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jsonFetch<{ rules: KeywordRule[] }>('/api/instagram/keywords');
      setRules(data.rules);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando reglas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingId(null); setForm({ ...EMPTY_RULE }); setModalOpen(true); };
  const openEdit = (r: KeywordRule) => {
    setEditingId(r.id);
    setForm({
      keyword: r.keyword, matchType: r.matchType,
      commentRepliesText: r.commentReplies.join('\n'),
      dmMessage: r.dmMessage, dmLink: r.dmLink || '',
      replyToComment: r.replyToComment, dmEnabled: r.dmEnabled,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.keyword.trim()) { toast.error('Escribe la palabra clave'); return; }
    if (!form.dmMessage.trim() && !form.commentRepliesText.trim()) {
      toast.error('Define al menos el DM o una respuesta al comentario'); return;
    }
    setSaving(true);
    try {
      const body = {
        keyword: form.keyword.trim(),
        matchType: form.matchType,
        commentReplies: form.commentRepliesText.split('\n').map((s) => s.trim()).filter(Boolean),
        dmMessage: form.dmMessage,
        dmLink: form.dmLink || null,
        replyToComment: form.replyToComment,
        dmEnabled: form.dmEnabled,
      };
      if (editingId) {
        await jsonFetch(`/api/instagram/keywords/${editingId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
      } else {
        await jsonFetch('/api/instagram/keywords', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
      }
      toast.success(editingId ? 'Regla actualizada' : 'Regla creada');
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: KeywordRule) => {
    try {
      await jsonFetch(`/api/instagram/keywords/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !r.enabled }),
      });
      toast.success(!r.enabled ? `"${r.keyword}" activada` : `"${r.keyword}" pausada`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const remove = async (r: KeywordRule) => {
    if (!window.confirm(`¿Eliminar la regla "${r.keyword}"?`)) return;
    try {
      await jsonFetch(`/api/instagram/keywords/${r.id}`, { method: 'DELETE' });
      toast.success('Regla eliminada');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div>
      <div className="card mb-4" style={{ borderLeft: '3px solid var(--rai-warning)' }}>
        <p style={{ margin: 0 }}>
          <AlertTriangle size={15} style={{ display: 'inline', verticalAlign: -2, color: 'var(--rai-warning)' }} />{' '}
          <strong>Cómo funciona:</strong> cuando alguien comenta la palabra clave en tus posts, el sistema responde el
          comentario en público y le envía la guía por DM.{' '}
          <span className="muted">
            Los DMs requieren el permiso <code>instagram_manage_messages</code> aprobado por Meta (App Review) — las
            reglas quedan construidas y con interruptor listo; mientras tanto las respuestas públicas a comentarios
            funcionan con el permiso estándar.
          </span>
        </p>
      </div>

      <div className="row-between mb-4">
        <h3 className="h3">Reglas ({rules.length})</h3>
        <button className="primary btn-sm" onClick={openCreate}><Plus size={14} /> Nueva regla</button>
      </div>

      {rules.length === 0 && !loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <MessageCircle size={40} style={{ color: 'var(--rai-gold)', margin: '0 auto 12px' }} />
          <h3 className="h3">Aún no tienes palabras clave</h3>
          <p className="muted mb-4">
            Ejemplo: la gente comenta &quot;CRM&quot; → reciben por DM el enlace a tu guía gratuita.
          </p>
          <button className="primary" onClick={openCreate}><Plus size={16} /> Crear la primera</button>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: 14 }}>
          {rules.map((r) => (
            <div key={r.id} className="card" style={{ opacity: r.enabled ? 1 : 0.55 }}>
              <div className="row-between mb-2">
                <span className="badge-gold" style={{ fontSize: 14 }}>&quot;{r.keyword}&quot;</span>
                <div className="row" style={{ gap: 4 }}>
                  <button className="ghost btn-icon" title={r.enabled ? 'Pausar' : 'Activar'} onClick={() => toggle(r)}>
                    {r.enabled ? <CheckCircle2 size={16} style={{ color: 'var(--rai-success)' }} /> : <XCircle size={16} />}
                  </button>
                  <button className="ghost btn-icon" title="Editar" onClick={() => openEdit(r)}><Pencil size={15} /></button>
                  <button className="ghost btn-icon" title="Eliminar" onClick={() => remove(r)}>
                    <Trash2 size={15} style={{ color: 'var(--rai-error)' }} />
                  </button>
                </div>
              </div>
              {r.dmMessage && (
                <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  <Send size={12} style={{ display: 'inline', verticalAlign: -2 }} /> DM: {r.dmMessage.slice(0, 90)}{r.dmMessage.length > 90 ? '…' : ''}
                </p>
              )}
              {r.dmLink && (
                <p className="muted" style={{ fontSize: 12, marginBottom: 6, wordBreak: 'break-all' }}>🔗 {r.dmLink}</p>
              )}
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <span className="badge-muted" style={{ fontSize: 11 }}>{r.matchType === 'exact' ? 'Coincidencia exacta' : 'Contiene la palabra'}</span>
                {r.replyToComment && <span className="badge-muted" style={{ fontSize: 11 }}>Responde comentario</span>}
                <span className="badge-purple" style={{ fontSize: 11 }}>{r.triggerCount} disparos</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="h3 mb-4">{editingId ? 'Editar regla' : 'Nueva regla de palabra clave'}</h3>

            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="label">Palabra clave</label>
                <input className="input w-full" placeholder="CRM" value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Tipo de coincidencia</label>
                <select className="input w-full" value={form.matchType}
                  onChange={(e) => setForm({ ...form, matchType: e.target.value as 'contains' | 'exact' })}>
                  <option value="contains">Contiene la palabra</option>
                  <option value="exact">Comentario exacto</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="label row" style={{ gap: 8 }}>
                <input type="checkbox" checked={form.dmEnabled}
                  onChange={(e) => setForm({ ...form, dmEnabled: e.target.checked })} />
                Enviar DM automático <span className="badge-warning" style={{ fontSize: 10 }}>pendiente de Meta</span>
              </label>
              <textarea className="input w-full" rows={3}
                placeholder="¡Hola! 👋 Aquí tienes la guía que pediste:"
                value={form.dmMessage}
                onChange={(e) => setForm({ ...form, dmMessage: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="label">Enlace que se envía en el DM (guía, PDF, landing)</label>
              <input className="input w-full" placeholder="https://…"
                value={form.dmLink}
                onChange={(e) => setForm({ ...form, dmLink: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="label row" style={{ gap: 8 }}>
                <input type="checkbox" checked={form.replyToComment}
                  onChange={(e) => setForm({ ...form, replyToComment: e.target.checked })} />
                Responder también el comentario en público
              </label>
              <textarea className="input w-full" rows={3}
                placeholder={'Una respuesta por línea (se elige al azar):\nTe lo envié por DM 📩\n¡Revisa tus mensajes! ✅'}
                value={form.commentRepliesText}
                onChange={(e) => setForm({ ...form, commentRepliesText: e.target.value })} />
            </div>

            <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
              <button className="secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="primary" disabled={saving} onClick={save}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Actividad
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<string, string> = {
  publish: 'Publicación',
  comment_reply: 'Respuesta a comentario',
  dm_sent: 'DM enviado',
  webhook: 'Webhook',
  cron: 'Cron',
  error: 'Error',
};

function ActivityTab() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jsonFetch<{ logs: ActionLog[] }>('/api/instagram/logs');
      setLogs(data.logs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando actividad');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="row-between mb-4">
        <h3 className="h3">Últimas 100 acciones</h3>
        <button className="secondary btn-sm" onClick={load}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {logs.length === 0 && !loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Activity size={40} style={{ color: 'var(--rai-gold)', margin: '0 auto 12px' }} />
          <h3 className="h3">Aún no hay actividad</h3>
          <p className="muted">Aquí verás cada publicación automática, respuesta y DM que el sistema ejecute.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table w-full">
            <thead>
              <tr><th>Fecha</th><th>Acción</th><th>Usuario IG</th><th>Detalle</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(l.createdAt)}</td>
                  <td>{KIND_LABELS[l.kind] || l.kind}</td>
                  <td>{l.igUsername ? `@${l.igUsername}` : '—'}</td>
                  <td style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.detail}>
                    {l.detail}
                  </td>
                  <td>
                    <span className={l.status === 'ok' ? 'badge-success' : l.status === 'failed' ? 'badge-error' : 'badge-muted'}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Cuenta
// ---------------------------------------------------------------------------

function AccountTab({ account, refresh }: { account: AccountInfo | null; refresh: () => Promise<void> }) {
  const [accessToken, setAccessToken] = useState('');
  const [igUserId, setIgUserId] = useState('');
  const [pageId, setPageId] = useState('');
  const [saving, setSaving] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [settingUp, setSettingUp] = useState(false);

  const connect = async () => {
    if (!accessToken.trim() || !igUserId.trim()) {
      toast.error('Token e ID de Instagram Business son obligatorios'); return;
    }
    setSaving(true);
    const t = toast.loading('Validando con Meta…');
    try {
      const data = await jsonFetch<{ username: string }>('/api/instagram/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: accessToken.trim(), igUserId: igUserId.trim(), pageId: pageId.trim() || undefined }),
      });
      toast.success(`Conectado como @${data.username} ✔`, { id: t });
      setAccessToken('');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error', { id: t, duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  const runSetup = async () => {
    if (!setupSecret.trim()) { toast.error('Pega el CRON_SECRET'); return; }
    setSettingUp(true);
    const t = toast.loading('Creando tablas en la base de datos…');
    try {
      const data = await jsonFetch<{ message: string }>(`/api/admin/setup-instagram?secret=${encodeURIComponent(setupSecret.trim())}`, { method: 'POST' });
      toast.success(data.message, { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error', { id: t, duration: 8000 });
    } finally {
      setSettingUp(false);
    }
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start', gap: 20 }}>
      <div>
        <div className="card mb-4">
          <h3 className="h3 mb-4">Estado de la conexión</h3>
          {account?.connected ? (
            <>
              <p><CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: -3, color: 'var(--rai-success)' }} />{' '}
                Conectado como <strong>@{account.username}</strong>
                {account.source === 'env' ? ' (vía variables de entorno)' : ' (token guardado en el CRM)'}
              </p>
              <div className="row mt-4" style={{ gap: 16 }}>
                <div><div className="h2">{account.followers ?? '—'}</div><div className="muted" style={{ fontSize: 12 }}>Seguidores</div></div>
                <div><div className="h2">{account.mediaCount ?? '—'}</div><div className="muted" style={{ fontSize: 12 }}>Publicaciones</div></div>
              </div>
            </>
          ) : (
            <>
              <p className="muted">
                <XCircle size={16} style={{ display: 'inline', verticalAlign: -3, color: 'var(--rai-error)' }} />{' '}
                Instagram no está conectado todavía.
              </p>
              {account?.lastError && (
                <p style={{ color: 'var(--rai-error)', fontSize: 13 }}>Último error: {account.lastError}</p>
              )}
            </>
          )}
          <button className="secondary btn-sm mt-4" onClick={() => refresh()}>
            <RefreshCw size={14} /> Verificar de nuevo
          </button>
        </div>

        <div className="card">
          <h3 className="h3 mb-4"><Database size={16} style={{ display: 'inline', verticalAlign: -2 }} /> Preparar base de datos</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            Solo la primera vez: crea las tablas del módulo Instagram en Supabase (idempotente — correrlo dos veces no
            daña nada). Pega el mismo valor que pusiste en la variable <code>CRON_SECRET</code> de Vercel.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" style={{ flex: 1 }} type="password" placeholder="CRON_SECRET"
              value={setupSecret} onChange={(e) => setSetupSecret(e.target.value)} />
            <button className="primary" disabled={settingUp} onClick={runSetup}>
              {settingUp ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />} Crear tablas
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="h3 mb-4"><Layers size={16} style={{ display: 'inline', verticalAlign: -2 }} /> Conectar cuenta de Instagram</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Guía completa paso a paso (desde el teléfono) en <code>docs/INSTAGRAM_SETUP.md</code> del repo. Necesitas una
          cuenta IG <strong>profesional</strong> vinculada a una Página de Facebook y un token de acceso de larga duración.
        </p>
        <div className="form-group">
          <label className="label">Access Token (larga duración)</label>
          <textarea className="input w-full" rows={3} placeholder="EAAG…" value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Instagram Business ID (17841…)</label>
          <input className="input w-full" placeholder="17841400000000000" value={igUserId}
            onChange={(e) => setIgUserId(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Facebook Page ID (para DMs — opcional)</label>
          <input className="input w-full" placeholder="1000000000000" value={pageId}
            onChange={(e) => setPageId(e.target.value)} />
        </div>
        <button className="primary w-full" disabled={saving} onClick={connect}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Instagram size={15} />} Conectar
        </button>
        <p className="muted mt-4" style={{ fontSize: 12 }}>
          El token se guarda cifrado (AES-256-GCM) en tu base de datos. Alternativa sin UI: variables{' '}
          <code>INSTAGRAM_ACCESS_TOKEN</code> + <code>INSTAGRAM_BUSINESS_ID</code> + <code>FACEBOOK_PAGE_ID</code> en Vercel.
        </p>
      </div>
    </div>
  );
}
