'use client';

import React, { useMemo, useState } from 'react';
import { BedDouble, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROOM_STATUS_LABELS } from '@/components/hotel/StatusBadges';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/HelpTip';
import { ConfirmDialog } from './ConfirmDialog';
import { CreateRoomModal } from './CreateRoomModal';
import { invalidateSites, sendJson } from './sites-api';
import { countRoomsByStatus, statusTone, type Room } from './site-model';

interface Props {
  siteId: string;
  rooms: Room[];
  /** Vuelve a pedir el detalle del sitio. */
  onChanged: () => Promise<void>;
}

function RoomRow({ room, onChanged, onDelete }: { room: Room; onChanged: () => Promise<void>; onDelete: (r: Room) => void }) {
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const status = optimistic ?? room.status;

  async function change(next: string) {
    setOptimistic(next);
    const res = await sendJson<{ room: { id: string } }>(`/api/rooms/${room.id}`, 'PATCH', { status: next });
    if (!res.ok) {
      setOptimistic(null);
      toast.error(res.error);
      return;
    }
    invalidateSites();
    await onChanged();
    setOptimistic(null);
    toast.success('Estado actualizado');
  }

  return (
    <tr role="row">
      <th scope="row" role="rowheader" className="st-room-num">{room.number}</th>
      <td data-label="Piso" role="cell">{room.floor ?? <span className="muted">—</span>}</td>
      <td data-label="Tipo" role="cell">{room.roomType?.name ?? <span className="muted">—</span>}</td>
      <td data-label="Estado" role="cell">
        <div className="st-room-sel">
          <span className="fx-dot st-dot" data-tone={statusTone(status)} aria-hidden="true" />
          <select
            className="input" value={status} onChange={(e) => void change(e.target.value)}
            aria-label={`Estado de la habitación ${room.number}`} disabled={optimistic !== null}
          >
            {Object.entries(ROOM_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </td>
      <td data-label="Notas" role="cell" className="st-room-notes">{room.notes ?? <span className="muted">—</span>}</td>
      <td role="cell" className="st-room-del">
        <button
          type="button" className="ghost btn-icon st-icon-danger" onClick={() => onDelete(room)}
          aria-label={`Eliminar habitación ${room.number}`} title="Eliminar"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

export function RoomsSection({ siteId, rooms, onChanged }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [toDelete, setToDelete] = useState<Room | null>(null);
  const [filter, setFilter] = useState('');
  const counts = useMemo(() => countRoomsByStatus(rooms), [rooms]);
  const shown = filter ? rooms.filter((r) => r.status === filter) : rooms;
  const activeFilter = filter && counts[filter] ? filter : '';

  return (
    <section className="st-rooms-sec" aria-labelledby="st-rooms-title">
      <div className="st-section-head">
        <h2 id="st-rooms-title" className="st-section-title">
          <BedDouble size={18} color="var(--rai-gold)" aria-hidden="true" /> Habitaciones
          <span className="badge badge-gold">{rooms.length}</span>
          <HelpTip content="Inventario físico del sitio. Cada habitación se puede asignar a reservas y cambiar de estado (disponible, ocupada, limpieza, mantenimiento)." />
        </h2>
        <button type="button" className="primary btn-sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} aria-hidden="true" /> Añadir habitación
        </button>
      </div>

      {rooms.length === 0 ? (
        <EmptyState
          icon={BedDouble} title="Aún no tienes habitaciones"
          text="Añade tu inventario para empezar a registrar reservas en este sitio."
          action={<button type="button" className="primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} aria-hidden="true" /> Crear primera habitación</button>}
        />
      ) : (
        <>
          <div className="st-chip-group st-room-chips" role="group" aria-label="Filtrar habitaciones por estado">
            <button type="button" className={`st-chip${!activeFilter ? ' is-on' : ''}`} aria-pressed={!activeFilter} onClick={() => setFilter('')}>
              Todas <span className="st-chip-count">{rooms.length}</span>
            </button>
            {Object.entries(ROOM_STATUS_LABELS).filter(([k]) => counts[k]).map(([k, label]) => (
              <button
                key={k} type="button" className={`st-chip${activeFilter === k ? ' is-on' : ''}`}
                aria-pressed={activeFilter === k} onClick={() => setFilter(activeFilter === k ? '' : k)}
              >
                <span className="fx-dot st-dot" data-tone={statusTone(k)} aria-hidden="true" />
                {label} <span className="st-chip-count">{counts[k]}</span>
              </button>
            ))}
          </div>
          <div className="card st-rooms-card">
            <table className="table st-rooms" role="table">
              <caption className="fx-sr-only">Habitaciones del sitio</caption>
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">Número</th>
                  <th scope="col" role="columnheader">Piso</th>
                  <th scope="col" role="columnheader">Tipo</th>
                  <th scope="col" role="columnheader">Estado</th>
                  <th scope="col" role="columnheader">Notas</th>
                  <th scope="col" role="columnheader"><span className="fx-sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {shown.map((r) => <RoomRow key={r.id} room={r} onChanged={onChanged} onDelete={setToDelete} />)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showCreate && (
        <CreateRoomModal
          siteId={siteId} existing={rooms} onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); void onChanged(); }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title={`¿Eliminar la habitación ${toDelete.number}?`}
          description="Se quitará del inventario. Esta acción no se puede deshacer."
          confirmLabel="Eliminar habitación" busyLabel="Eliminando…"
          onClose={() => setToDelete(null)}
          onConfirm={async () => {
            const res = await sendJson<{ ok: boolean }>(`/api/rooms/${toDelete.id}`, 'DELETE');
            if (!res.ok) return res.error;
            invalidateSites();
            toast.success('Habitación eliminada');
            setToDelete(null);
            await onChanged();
            return null;
          }}
        />
      )}
    </section>
  );
}
