'use client';

import React, { useMemo } from 'react';
import { useContacts } from '../../contactos/_components/use-contacts';
import { AddOpportunityDialog } from './AddOpportunityDialog';
import type { Opportunity, OpportunityForm } from './opportunity-model';

interface AddOpportunityHostProps {
  initial?: Partial<OpportunityForm>;
  onClose: () => void;
  onCreate: (form: OpportunityForm) => Opportunity;
}

/** Carga los contactos reales (`/api/contacts`) solo mientras el diálogo está abierto. */
export function AddOpportunityHost({ initial, onClose, onCreate }: AddOpportunityHostProps) {
  const { contacts } = useContacts();
  const options = useMemo(
    () => contacts.map((c) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone })),
    [contacts],
  );
  return <AddOpportunityDialog initial={initial} contacts={options} onClose={onClose} onCreate={onCreate} />;
}
