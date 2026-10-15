'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ScheduledPostView {
  id: string;
  campaignRef: string | null;
  dayNumber: number | null;
  caption: string;
  mediaUrls: string[];
  mediaType: string;
  scheduledAt: string;
  timezone: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
  attempts: number;
  lastError: string | null;
  igMediaId: string | null;
  permalink: string | null;
  simulated: boolean;
  publishedAt: string | null;
}

export interface BatchDayInput {
  day: number;
  date: string;
  caption: string;
  mediaType?: 'image' | 'carousel';
  mediaUrls?: string[];
}

export interface BatchResponse {
  ok: boolean;
  mode?: 'simulated' | 'live';
  created?: number;
  updated?: number;
  skipped?: Array<{ day: number | null; reason: string }>;
  error?: string;
}

/** Estado de las publicaciones programadas de una campaña (fuente: BD, por workspace). */
export function useScheduledPosts(campaignRef: string | null) {
  const [posts, setPosts] = useState<ScheduledPostView[]>([]);
  const [mode, setMode] = useState<'simulated' | 'live'>('simulated');
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true); // false si la API/tabla aún no existe

  const refresh = useCallback(async () => {
    if (!campaignRef) { setPosts([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/content-planner/schedule?campaignRef=${encodeURIComponent(campaignRef)}`, { cache: 'no-store' });
      if (!res.ok) { setAvailable(false); return; }
      const data = (await res.json()) as { mode: 'simulated' | 'live'; posts: ScheduledPostView[] };
      setPosts(data.posts);
      setMode(data.mode);
      setAvailable(true);
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [campaignRef]);

  useEffect(() => { void refresh(); }, [refresh]);

  const schedule = useCallback(
    async (payload: { campaignRef: string; time?: string; timezone?: string; posts: BatchDayInput[] }): Promise<BatchResponse> => {
      try {
        const res = await fetch('/api/content-planner/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => ({}))) as BatchResponse;
        await refresh();
        return res.ok ? { ...data, ok: true } : { ok: false, error: data.error ?? 'No se pudo programar' };
      } catch {
        return { ok: false, error: 'Sin conexión con el servidor' };
      }
    },
    [refresh],
  );

  const act = useCallback(
    async (id: string, action: 'cancel' | 'retry' | 'publish-now'): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch(`/api/content-planner/schedule/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        await refresh();
        return res.ok ? { ok: true } : { ok: false, error: data.error ?? 'No se pudo completar la acción' };
      } catch {
        return { ok: false, error: 'Sin conexión con el servidor' };
      }
    },
    [refresh],
  );

  const byDay = new Map<number, ScheduledPostView>();
  for (const p of posts) if (p.dayNumber != null) byDay.set(p.dayNumber, p);

  return { posts, byDay, mode, loading, available, refresh, schedule, act };
}
