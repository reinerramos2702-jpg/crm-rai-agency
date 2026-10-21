'use client';

import React, { useMemo, useState } from 'react';
import { DoorOpen, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROOM_STATUS_LABELS } from '@/components/hotel/StatusBadges';
import { useCachedJson } from '@/lib/use-cached-json';
import { Dialog } from './Dialog';
import { SelectField, TextField, focusFirstInvalid } from './FormFields';
import { invalidateSites, sendJson } from './sites-api';
import { validateRoomForm, type Room, type RoomFormValues } from './site-model';

const STATUS_OPTIONS = Object.entries(ROOM_STATUS_LABELS).map(([value, label]) => ({ value, label }));

interface Props {
  siteId: string;
  existing: Room[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateRoomModal({ siteId, existing, onClose, onCreated }: Props) {
  const types = useCachedJson<{ roomTypes: Array<{ id: string; name: string }> }>('/api/room-types', { ttlMs: 60_000 });
  const formRef = React.useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<RoomFormValues>({ number: '', floor: '', roomTypeId: '', status: 'available', notes: '' });
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const all = useMemo(() => validateRoomForm(form, existing), [form, existing]);
  const errors = submitted ? all : { number: touched ? all.number : undefined, floor: touched ? all.floor : undefined };

  const typeOptions = [
    { value: '', label: types.loading ? 'Cargando tipos…' : '— Sin tipo —' },
    ...(types.data?.roomTypes ?? []).map((t) => ({ value: t.id, label: t.name })),
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(all).length > 0) { focusFirstInvalid(formRef.current); return; }
    setSaving(true);
    setServerError(null);
    const res = await sendJson<{ room: { id: string } }>('/api/rooms', 'POST', {
      siteId,
      number: form.number.trim(),
      floor: form.floor.trim(),
      status: form.status,
      notes: form.notes.trim(),
      roomTypeId: form.roomTypeId || undefined,
    });
    setSaving(false);
    if (!res.ok) { setServerError(res.error); toast.error(res.error); return; }
    invalidateSites();
    toast.success('Habitación creada');
    onCreated();
  }

  return (
    <Dialog
      title="Nueva habitación" icon={<DoorOpen size={18} />} size="sm" dismissible={!saving} onClose={onClose}
      description="Añade una unidad al inventario de este sitio."
    >
      <form ref={formRef} onSubmit={submit} noValidate className="st-dialog-form">
        <div className="st-form-grid">
          <TextField
            label="Número" required autoFocus maxLength={30} placeholder="101, A-203, Suite 5…"
            value={form.number} error={errors.number}
            onChange={(v) => setForm((f) => ({ ...f, number: v }))} onBlur={() => setTouched(true)}
          />
          <TextField
            label="Piso" maxLength={20} value={form.floor} error={errors.floor}
            onChange={(v) => setForm((f) => ({ ...f, floor: v }))} onBlur={() => setTouched(true)}
          />
          <SelectField
            label="Tipo" wide value={form.roomTypeId} options={typeOptions}
            hint={types.error && !types.data ? 'No se pudieron cargar los tipos; puedes crearla sin tipo.' : undefined}
            onChange={(v) => setForm((f) => ({ ...f, roomTypeId: v }))}
          />
          <SelectField
            label="Estado inicial" wide value={form.status} options={STATUS_OPTIONS}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
          <TextField
            label="Notas" wide rows={2} maxLength={500} value={form.notes}
            onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
          />
        </div>
        {serverError && (
          <p className="st-banner st-banner--err" role="alert">
            <TriangleAlert size={14} aria-hidden="true" /> {serverError}
          </p>
        )}
        <div className="st-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="primary" disabled={saving} aria-busy={saving}>
            {saving ? 'Creando…' : 'Crear habitación'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
