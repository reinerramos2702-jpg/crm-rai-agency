'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Rocket } from 'lucide-react';
import { hasBlocking, type StepIssue } from '@/lib/agent-wizard';
import type { CreateState } from './use-create-agent';
import { IssueList } from './wizard-fields';
import { TestChatPanel } from './TestChat';

interface Props {
  variant: 'chat' | 'voice';
  rows: ReadonlyArray<readonly [string, string]>;
  issues: readonly StepIssue[];
  state: CreateState;
  onCreate: () => void;
  /** Contenido extra tras crear el agente; si es función recibe el id del agente creado. */
  extraAfter?: React.ReactNode | ((agentId: string) => React.ReactNode);
}

/** Último paso: resumen, creación del agente y, una vez creado, prueba en vivo con su base de conocimiento. */
export function ReviewStep({ variant, rows, issues, state, onCreate, extraAfter }: Props) {
  const blocked = hasBlocking(issues);
  const creating = state.status === 'creating';
  const done = state.status === 'done';

  return (
    <div>
      <dl className="ag-summary">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>
        ))}
      </dl>

      <div style={{ marginTop: 16 }}>
        <IssueList issues={issues.filter((i) => i.level === 'warn').slice(0, 4)} />
        {blocked && <IssueList issues={issues.filter((i) => i.level === 'error')} />}
      </div>

      {state.status === 'error' && (
        <p className="ag-issue" data-level="error" role="alert" style={{ margin: '12px 0' }}>{state.message}</p>
      )}

      {!done && (
        <button type="button" className="ag-btn ag-btn--accent" style={{ marginTop: 8 }} onClick={onCreate} disabled={creating || blocked}>
          {creating ? <Loader2 className="animate-spin" size={14} aria-hidden="true" /> : <Rocket size={14} aria-hidden="true" />}
          {variant === 'voice' ? 'Crear agente de voz y probar' : 'Crear agente y probar'}
        </button>
      )}

      {done && (
        <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
          <div className="ag-banner" role="status">
            <span className="row" style={{ gap: 8 }}><CheckCircle2 size={16} color="var(--rai-success)" aria-hidden="true" /> Agente creado como borrador («Sugerido»). Pruébalo aquí y actívalo cuando estés listo.</span>
            <Link href={`/agentes-ia/${state.agentId}`} className="ag-btn ag-btn--accent">Abrir agente</Link>
          </div>
          {state.warning && <p className="ag-issue" data-level="warn" role="status">{state.warning}</p>}
          <TestChatPanel agentId={state.agentId} variant={variant} />
          {typeof extraAfter === 'function' ? extraAfter(state.agentId) : extraAfter}
        </div>
      )}
    </div>
  );
}
