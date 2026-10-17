'use client';

import React, { useState } from 'react';
import { CardsSkeleton, TabFrame } from './TabFrame';
import { InlineError } from './InlineError';
import { useSlaSettings } from '../_hooks/use-sla-settings';
import type { SettingsState } from '../_lib/conv-types';

function SlaForm({ initial, saving, onSave }: { initial: SettingsState; saving: boolean; onSave: (s: SettingsState) => Promise<boolean> }) {
  const [form, setForm] = useState<SettingsState>(initial);
  return (
    <form className="card cv-form-card cv-sla" onSubmit={(e) => { e.preventDefault(); void onSave(form); }}>
      <label htmlFor="cv-sla-first">ANS a punto de expirar (minutos para primera respuesta)</label>
      <input
        id="cv-sla-first" type="number" inputMode="numeric" min={1} max={10080} placeholder="Ej. 30"
        value={form.slaFirstResponseMins} onChange={(e) => setForm((p) => ({ ...p, slaFirstResponseMins: e.target.value }))}
      />
      <label htmlFor="cv-sla-over">ANS atrasado (minutos sin responder)</label>
      <input
        id="cv-sla-over" type="number" inputMode="numeric" min={1} max={10080} placeholder="Ej. 120"
        value={form.slaOverdueMins} onChange={(e) => setForm((p) => ({ ...p, slaOverdueMins: e.target.value }))}
      />
      <label className="cv-check cv-check--block">
        <input type="checkbox" checked={form.aiCountsAsResponse} onChange={(e) => setForm((p) => ({ ...p, aiCountsAsResponse: e.target.checked }))} />
        <span>Las respuestas de IA cuentan como respuesta para el ANS</span>
      </label>
      <button type="submit" className="primary cv-self-start" disabled={saving} aria-busy={saving}>
        {saving ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </form>
  );
}

/** Configuración del ANS (SLA). */
export function SettingsTab() {
  const { settings, loading, error, refresh, saving, save } = useSlaSettings();
  return (
    <TabFrame intro="Configura el ANS (SLA): define la rapidez con la que tu equipo debe responder.">
      {loading && <CardsSkeleton count={1} />}
      {error && !settings && <InlineError title="No se pudo cargar la configuración" message={error} onRetry={() => void refresh()} />}
      {settings && (
        <SlaForm
          key={`${settings.slaFirstResponseMins}|${settings.slaOverdueMins}|${settings.aiCountsAsResponse}`}
          initial={settings}
          saving={saving}
          onSave={save}
        />
      )}
    </TabFrame>
  );
}
