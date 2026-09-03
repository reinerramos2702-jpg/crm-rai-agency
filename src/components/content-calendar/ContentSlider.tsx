'use client';

import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Plus, ImageOff } from 'lucide-react';
import { HelpTip } from '@/components/ui/HelpTip';
import { Badge } from '@/components/ui/Badge';
import { PostDTO, PostStatus, STATUS_META, TIPS } from '@/lib/content-calendar/types';

type BadgeVariant = 'success' | 'error' | 'warning' | 'gold' | 'purple' | 'muted';

/** Traduce el `badge` de STATUS_META (p.ej. "badge-success") a la variant de <Badge>. */
function statusBadgeVariant(status: PostStatus): BadgeVariant {
  const raw = STATUS_META[status].badge.replace('badge-', '');
  const valid: BadgeVariant[] = ['success', 'error', 'warning', 'gold', 'purple', 'muted'];
  return (valid as string[]).includes(raw) ? (raw as BadgeVariant) : 'muted';
}

/** Lunes de la semana que contiene `date`. */
export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function toYMD(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function fmtWeekRange(start: Date) {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
}

interface ContentSliderProps {
  weekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
  posts: PostDTO[];
  loading?: boolean;
  onMovePost: (postId: string, newDay: string) => void;
  onNewPost: (day: string) => void;
  onEditPost: (post: PostDTO) => void;
}

/**
 * #01 Slider semanal + #02 drag&drop + #03 estados por color.
 * Muestra 7 tarjetas (una por día) con scroll horizontal en pantallas chicas.
 */
export function ContentSlider({
  weekStart,
  onWeekChange,
  posts,
  loading,
  onMovePost,
  onNewPost,
  onEditPost,
}: ContentSliderProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const postsByDay = React.useMemo(() => {
    const map: Record<string, PostDTO[]> = {};
    for (const d of days) map[toYMD(d)] = [];
    for (const p of posts) {
      const key = p.day || (p.scheduledFor ? p.scheduledFor.slice(0, 10) : null);
      if (key && map[key]) map[key].push(p);
    }
    return map;
  }, [posts, days]);

  const activePost = activeId ? posts.find((p) => p.id === activeId) || null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const postId = String(active.id);
    const newDay = String(over.id);
    const post = posts.find((p) => p.id === postId);
    const currentDay = post?.day || (post?.scheduledFor ? post.scheduledFor.slice(0, 10) : null);
    if (currentDay === newDay) return;
    onMovePost(postId, newDay);
  }

  return (
    <div>
      <div className="row-between mb-4">
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onWeekChange(addDays(weekStart, -7))} aria-label="Semana anterior">
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 600, minWidth: 180, textAlign: 'center' }}>{fmtWeekRange(weekStart)}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onWeekChange(addDays(weekStart, 7))} aria-label="Semana siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onWeekChange(startOfWeek(new Date()))}>
          Hoy
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(200px, 1fr))',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {days.map((d, i) => {
            const ymd = toYMD(d);
            const isToday = ymd === toYMD(new Date());
            return (
              <DayColumn
                key={ymd}
                day={ymd}
                label={DAY_NAMES[i]}
                dateNum={d.getDate()}
                isToday={isToday}
                posts={postsByDay[ymd] || []}
                loading={loading}
                onNewPost={onNewPost}
                onEditPost={onEditPost}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activePost ? <PostMiniCard post={activePost} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function DayColumn({
  day,
  label,
  dateNum,
  isToday,
  posts,
  loading,
  onNewPost,
  onEditPost,
}: {
  day: string;
  label: string;
  dateNum: number;
  isToday: boolean;
  posts: PostDTO[];
  loading?: boolean;
  onNewPost: (day: string) => void;
  onEditPost: (post: PostDTO) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day });

  return (
    <div
      ref={setNodeRef}
      className="card no-hover"
      style={{
        minHeight: 260,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        border: isOver
          ? '1px solid var(--rai-gold)'
          : isToday
          ? '1px solid rgba(201,168,76,0.4)'
          : undefined,
        background: isOver ? 'rgba(201,168,76,0.06)' : undefined,
      }}
    >
      <div className="row-between">
        <div>
          <div style={{ fontSize: 12, color: 'var(--rai-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
          </div>
          <div style={{ fontWeight: 700, color: isToday ? 'var(--rai-gold)' : 'var(--rai-text)' }}>{dateNum}</div>
        </div>
        <HelpTip content={TIPS.newPost}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: 4, minWidth: 0 }}
            onClick={() => onNewPost(day)}
            aria-label="Nueva publicación"
          >
            <Plus size={14} />
          </button>
        </HelpTip>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {loading ? (
          <div className="muted" style={{ fontSize: 12 }}>
            Cargando…
          </div>
        ) : posts.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed var(--rai-border)',
              borderRadius: 8,
              minHeight: 80,
              fontSize: 12,
              color: 'var(--rai-muted)',
              textAlign: 'center',
              padding: 8,
            }}
          >
            Sin publicaciones
          </div>
        ) : (
          posts.map((p) => <DraggablePost key={p.id} post={p} onEditPost={onEditPost} />)
        )}
      </div>
    </div>
  );
}

function DraggablePost({ post, onEditPost }: { post: PostDTO; onEditPost: (post: PostDTO) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: post.id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={() => onEditPost(post)}>
      <PostMiniCard post={post} />
    </div>
  );
}

function PostMiniCard({ post, dragging }: { post: PostDTO; dragging?: boolean }) {
  const meta = STATUS_META[post.status];
  const thumb = post.media?.[0]?.thumbUrl || post.media?.[0]?.url || null;

  return (
    <div
      className="card no-hover"
      style={{
        padding: 8,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        boxShadow: dragging ? '0 8px 24px rgba(0,0,0,0.4)' : undefined,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--rai-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <ImageOff size={16} color="var(--rai-muted)" />
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {post.title || post.caption || 'Sin título'}
        </div>
        <div className="row-between" style={{ marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--rai-muted)' }}>{post.time || '—'}</span>
          <Badge variant={statusBadgeVariant(post.status)}>{meta.label}</Badge>
        </div>
      </div>
    </div>
  );
}

export default ContentSlider;
