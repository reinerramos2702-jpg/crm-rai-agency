'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { HelpTip } from '@/components/ui/HelpTip';
import {
  MEDIA_TYPE_LABELS,
  MediaType,
  Network,
  NETWORKS,
  PostDTO,
  TIPS,
} from '@/lib/content-calendar/types';

interface PostEditorProps {
  open: boolean;
  onClose: () => void;
  /** Post a editar; null/undefined = modo creación. */
  post?: PostDTO | null;
  /** Día 'YYYY-MM-DD' preseleccionado al crear (viene del botón "+" del día). */
  defaultDay?: string | null;
  /** Se llama tras guardar/duplicar/eliminar con éxito para que la página recargue la lista. */
  onSaved: () => void;
}

function toDateTimeLocal(iso: string | null, fallbackDay?: string | null) {
  if (iso) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (fallbackDay) return `${fallbackDay}T09:00`;
  return '';
}

/**
 * Modal de creación/edición de un post del Calendario de Contenido.
 *
 * Limitación conocida: no hay upload real de archivos todavía — las URLs de
 * media se pegan a mano, separadas por coma.
 */
export function PostEditor({ open, onClose, post, defaultDay, onSaved }: PostEditorProps) {
  const isEditing = !!post;

  const [caption, setCaption] = useState('');
  const [mediaUrlsText, setMediaUrlsText] = useState('');
  const [networks, setNetworks] = useState<Network[]>([]);
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [scheduledFor, setScheduledFor] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (post) {
      setCaption(post.caption || '');
      setMediaUrlsText((post.media || []).map((m) => m.url).join(', '));
      setNetworks(post.networks || []);
      setMediaType(post.mediaType || 'image');
      setScheduledFor(toDateTimeLocal(post.scheduledFor, null));
    } else {
      setCaption('');
      setMediaUrlsText('');
      setNetworks([]);
      setMediaType('image');
      setScheduledFor(toDateTimeLocal(null, defaultDay));
    }
  }, [open, post, defaultDay]);

  function toggleNetwork(id: Network) {
    setNetworks((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (networks.length === 0) {
      toast.error('Selecciona al menos una red.');
      return;
    }
    const mediaUrls = mediaUrlsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const body = {
      caption: caption.trim() || undefined,
      mediaUrls,
      networks,
      mediaType,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
    };

    setSaving(true);
    try {
      const res = await fetch(
        isEditing ? `/api/content-posts/${post!.id}` : '/api/content-posts',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (res.ok) {
        toast.success(isEditing ? 'Publicación actualizada.' : 'Publicación creada.');
        onSaved();
        onClose();
      } else if (res.status === 422) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Ese día no admite más publicaciones.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    if (!confirm('¿Eliminar esta publicación?')) return;
    try {
      const res = await fetch(`/api/content-posts/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Publicación eliminada.');
        onSaved();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    }
  }

  async function handleDuplicate() {
    if (!post) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/content-posts/${post.id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        toast.success('Publicación duplicada.');
        onSaved();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar publicación' : 'Nueva publicación'} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Input
          label="URLs de media (separadas por coma)"
          hint="Aún no hay subida de archivos: pega las URLs de las imágenes/videos ya alojados."
          placeholder="https://…/foto1.jpg, https://…/foto2.jpg"
          value={mediaUrlsText}
          onChange={(e) => setMediaUrlsText(e.target.value)}
        />

        <Textarea
          label="Caption"
          placeholder="Escribe el texto de la publicación…"
          rows={4}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />

        <div className="form-group">
          <label>Redes</label>
          <div className="row" style={{ gap: 16 }}>
            {NETWORKS.map((n) => (
              <label key={n.id} className="row" style={{ gap: 6, fontWeight: 400, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={networks.includes(n.id)}
                  onChange={() => toggleNetwork(n.id)}
                />
                {n.label}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Tipo de contenido</label>
          <select value={mediaType} onChange={(e) => setMediaType(e.target.value as MediaType)}>
            {Object.entries(MEDIA_TYPE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Fecha y hora programada"
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
        />

        <div className="row-between" style={{ marginTop: 16, gap: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            {isEditing && (
              <Button variant="danger" size="sm" onClick={handleDelete} type="button">
                Eliminar
              </Button>
            )}
            {isEditing && (
              <HelpTip content={TIPS.duplicate}>
                <Button variant="secondary" size="sm" onClick={handleDuplicate} loading={duplicating} type="button">
                  <Copy size={14} /> Duplicar
                </Button>
              </HelpTip>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving} type="button">
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default PostEditor;
