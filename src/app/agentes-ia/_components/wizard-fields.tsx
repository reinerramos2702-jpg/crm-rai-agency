import React from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import type { Choice, StepIssue } from '@/lib/agent-wizard';

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="ag-field">
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="ag-hint">{hint}</span>}
    </div>
  );
}

export function IssueList({ issues }: { issues: readonly StepIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="ag-issues" role="status">
      {issues.map((i) => (
        <div key={`${i.field}-${i.message}`} className="ag-issue" data-level={i.level}>
          {i.level === 'error' ? <XCircle size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
          <span>{i.message}</span>
        </div>
      ))}
    </div>
  );
}

interface ChoiceGridProps<T extends string> {
  options: readonly Choice<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}

/** Tarjetas de selección única (cada una es un botón con `aria-pressed`). */
export function ChoiceGrid<T extends string>({ options, value, onChange, label }: ChoiceGridProps<T>) {
  return (
    <div className="ag-choices" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className="ag-choice" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          <strong>{o.label}</strong>
          <span>{o.description}</span>
        </button>
      ))}
    </div>
  );
}

export function CheckRow({ checked, onChange, title, text }: { checked: boolean; onChange: (v: boolean) => void; title: string; text?: string }) {
  return (
    <label className="ag-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="ag-check-body">
        <strong>{title}</strong>
        {text && <span>{text}</span>}
      </span>
    </label>
  );
}
