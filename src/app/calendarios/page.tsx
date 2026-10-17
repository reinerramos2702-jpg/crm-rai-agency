'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { CalendarDays, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppointmentsTab } from './_components/AppointmentsTab';
import { CalendarsTab } from './_components/CalendarsTab';
import { ConnectionsTab } from './_components/ConnectionsTab';
import { ModalHost } from './_components/ModalHost';
import { TabsNav, tabButtonId, tabPanelId, type TabId } from './_components/TabsNav';
import { upcomingCountByCalendar, withTimes } from './_components/appointment-logic';
import type { ModalState } from './_components/modal-state';
import { useCalendarActions } from './_components/use-calendar-actions';
import { useCalendarData } from './_components/use-calendar-data';
import { useNow } from './_components/use-now';
import './calendarios.css';

export default function CalendariosPage() {
  const data = useCalendarData();
  const actions = useCalendarActions(data);
  const now = useNow();
  const [tab, setTab] = useState<TabId>('calendarios');
  const [modal, setModal] = useState<ModalState | null>(null);

  const { groups, calendars, appointments } = data;
  const noCalendars = !calendars.loading && calendars.items.length === 0;
  const upcoming = useMemo(
    () => upcomingCountByCalendar(withTimes(appointments.items), now),
    [appointments.items, now],
  );

  const openModal = useCallback((next: ModalState) => {
    if (next.kind === 'appointment' && !next.appointment && noCalendars) {
      toast.error('Primero crea al menos un calendario.');
      return;
    }
    setModal(next);
  }, [noCalendars]);
  const closeModal = useCallback(() => setModal(null), []);

  const refreshing = groups.revalidating || calendars.revalidating || appointments.revalidating;
  function refreshAll() {
    void groups.refresh();
    void calendars.refresh();
    void appointments.refresh();
  }

  return (
    <div className="container cal-page">
      <div className="cal-head">
        <div>
          <div className="cal-title">
            <CalendarDays size={20} color="var(--rai-gold)" aria-hidden="true" />
            <h1 className="h1">Calendarios</h1>
          </div>
          <p className="muted cal-lead">Gestiona tus calendarios, citas y conexiones externas.</p>
        </div>
        <button
          type="button" className="ghost cal-refresh" aria-label="Actualizar calendarios y citas" title="Actualizar"
          disabled={refreshing} onClick={refreshAll}
        >
          <RotateCw size={14} className={refreshing ? 'cal-spin' : undefined} aria-hidden="true" />
        </button>
      </div>

      <TabsNav active={tab} onChange={setTab} />

      <div role="tabpanel" id={tabPanelId(tab)} aria-labelledby={tabButtonId(tab)} className="cal-tabpanel">
        {tab === 'calendarios' && (
          <CalendarsTab data={data} upcoming={upcoming} actions={actions} openModal={openModal} />
        )}
        {tab === 'citas' && (
          <AppointmentsTab data={data} actions={actions} openModal={openModal} onGoToCalendars={() => setTab('calendarios')} />
        )}
        {tab === 'conexiones' && <ConnectionsTab />}
      </div>

      <ModalHost modal={modal} data={data} actions={actions} onClose={closeModal} openModal={openModal} />
    </div>
  );
}
