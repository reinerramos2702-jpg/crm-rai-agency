'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useScheduledPosts, type ScheduledPostView } from '../useScheduledPosts';
import { CONTENT_TYPE_LABELS } from './constants';
import type { IgSession } from './useIgSession';
import { applyServerStatus, buildBatch, nextPendingPost } from './utils';

interface Options {
  session: IgSession;
  publishTime: string;
  timezone: string;
}

/** Programación y publicación de la campaña activa: lote, siguiente pieza, reintentos y estado del servidor. */
export function useIgScheduling({ session, publishTime, timezone }: Options) {
  const { activeCampaign, setActiveCampaign, setCampaigns, setView, setChatInput } = session;
  const sched = useScheduledPosts(activeCampaign?.id ?? null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [nextBusy, setNextBusy] = useState(false);

  const batch = useMemo(() => buildBatch(activeCampaign, sched.byDay), [activeCampaign, sched.byDay]);

  // Lo publicado en el servidor se refleja en el estado del día de la campaña.
  useEffect(() => {
    if (!activeCampaign || applyServerStatus(activeCampaign, sched.byDay) === null) return;
    const id = activeCampaign.id;
    const apply = (c: typeof activeCampaign) => applyServerStatus(c, sched.byDay) ?? c;
    setActiveCampaign((c) => (c && c.id === id ? apply(c) : c));
    setCampaigns((list) => list.map((c) => (c.id === id ? apply(c) : c)));
  }, [sched.byDay, activeCampaign, setActiveCampaign, setCampaigns]);

  const confirmBatch = useCallback(async () => {
    if (!activeCampaign) return { ok: false, error: 'Sin campaña activa' };
    return sched.schedule({ campaignRef: activeCampaign.id, time: publishTime, timezone, posts: batch.valid });
  }, [activeCampaign, sched, publishTime, timezone, batch.valid]);

  const publishNext = useCallback(async () => {
    const next = nextPendingPost(sched.posts);
    if (!next) { toast('No hay publicaciones programadas pendientes'); return; }
    setNextBusy(true);
    const r = await sched.act(next.id, 'publish-now');
    setNextBusy(false);
    if (r.ok) toast.success(`Día ${next.dayNumber} ${sched.mode === 'simulated' ? 'publicado (simulado)' : 'publicado en Instagram'}`);
    else toast.error(r.error ?? 'No se pudo publicar');
  }, [sched]);

  const regenerateDay = useCallback(() => {
    if (!activeCampaign || selectedDay == null) return;
    const d = activeCampaign.days.find((x) => x.day === selectedDay);
    if (!d) return;
    setChatInput(`Regenera el día ${d.day} (pilar ${d.pillar}, ${CONTENT_TYPE_LABELS[d.type]}): mantén el mismo pilar pero propón un gancho y un caption nuevos.`);
    setView('planner');
  }, [activeCampaign, selectedDay, setChatInput, setView]);

  const cancelOrRetry = useCallback(async (post: ScheduledPostView, action: 'cancel' | 'retry') => {
    const r = await sched.act(post.id, action);
    if (r.ok) toast.success(action === 'cancel' ? `Día ${post.dayNumber} cancelado` : `Día ${post.dayNumber} reprogramado`);
    else toast.error(r.error ?? 'No se pudo completar la acción');
  }, [sched]);

  const toggleDay = useCallback((day: number) => setSelectedDay((cur) => (cur === day ? null : day)), []);
  const hasPending = nextPendingPost(sched.posts) !== undefined;

  return { sched, batch, dialogOpen, setDialogOpen, selectedDay, toggleDay, nextBusy, hasPending, confirmBatch, publishNext, regenerateDay, cancelOrRetry };
}
