'use client';

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HelpTip } from '@/components/ui/HelpTip';
import { ContentSlider, startOfWeek, addDays, toYMD } from '@/components/content-calendar/ContentSlider';
import { PostEditor } from '@/components/content-calendar/PostEditor';
import { PostDTO, TIPS } from '@/lib/content-calendar/types';

/**
 * Calendario de Contenido — núcleo (Bloque 2A, v3.0-master-prompt).
 * Slider semanal (#01), drag&drop entre días (#02), estados por color (#03),
 * duplicar (#05), tooltips contextuales (#19). El resto de las 20 funcionalidades
 * (preview de feed, vista mes, banco de contenido, IA, publicación real vía
 * Graph API, aprobación en dos pasos, recorrido guiado) quedan para el
 * Bloque 2B — documentado en historial-entregas.md, no es un olvido.
 */
export default function CalendarioContenidoPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostDTO | null>(null);
  const [defaultDay, setDefaultDay] = useState<string | null>(null);

  const loadPosts = useCallback(async (start: Date) => {
    setLoading(true);
    try {
      const from = toYMD(start);
      const to = toYMD(addDays(start, 6));
      const res = await fetch(`/api/content-posts?from=${from}&to=${to}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'No se pudieron cargar las publicaciones.');
        setPosts([]);
        return;
      }
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : data.posts || []);
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(weekStart);
  }, [weekStart, loadPosts]);

  function handleNewPost(day: string) {
    setEditingPost(null);
    setDefaultDay(day);
    setEditorOpen(true);
  }

  function handleEditPost(post: PostDTO) {
    setEditingPost(post);
    setDefaultDay(null);
    setEditorOpen(true);
  }

  async function handleMovePost(postId: string, newDay: string) {
    // Conserva la hora ya programada del post, solo cambia el día. Si no tenía
    // hora (estaba en borrador), usa 09:00 por default.
    const moved = posts.find((p) => p.id === postId);
    const time = moved?.time || '09:00';
    const newScheduledFor = `${newDay}T${time}:00.000Z`;

    // Optimista: refleja el movimiento antes de la respuesta del servidor.
    const prev = posts;
    setPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, day: newDay, scheduledFor: newScheduledFor } : p))
    );
    try {
      const res = await fetch(`/api/content-posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor: newScheduledFor }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'No se pudo mover la publicación.');
        setPosts(prev); // revertir
        return;
      }
      toast.success('Publicación reprogramada.');
      loadPosts(weekStart); // re-sincroniza con la fecha/hora real que asignó el servidor
    } catch {
      toast.error('Error de red: no se pudo mover la publicación.');
      setPosts(prev);
    }
  }

  return (
    <div className="container">
      <div className="mb-6 row-between">
        <div>
          <h1 className="h1">Calendario de Contenido</h1>
          <p className="muted">Sube, programa y publica el contenido de tus redes en un solo lugar.</p>
        </div>
        <HelpTip content={TIPS.newPost}>
          <Button variant="primary" onClick={() => handleNewPost(toYMD(new Date()))}>
            <Plus size={16} /> Nueva publicación
          </Button>
        </HelpTip>
      </div>

      <ContentSlider
        weekStart={weekStart}
        onWeekChange={setWeekStart}
        posts={posts}
        loading={loading}
        onMovePost={handleMovePost}
        onNewPost={handleNewPost}
        onEditPost={handleEditPost}
      />

      <PostEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        post={editingPost}
        defaultDay={defaultDay}
        onSaved={() => loadPosts(weekStart)}
      />
    </div>
  );
}
