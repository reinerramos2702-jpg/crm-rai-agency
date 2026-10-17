'use client';

import React from 'react';
import { DayCard } from './DayCard';

interface Task {
  id: string;
  index: number;
  status: string;
  errorAgent?: string;
  errorMessage?: string;
  costUsd?: number;
  masterNode: Record<string, unknown>;
  assets?: Array<{ kind: string; publicUrl: string }>;
}

interface DayGridProps {
  tasks: Task[];
  onRetry?: (taskId: string) => void;
  onPublish?: (taskId: string) => void;
}

/**
 * Grilla visual de días: muestra todas las DayCards en un grid responsive.
 */
export function DayGrid({ tasks, onRetry, onPublish }: DayGridProps) {
  if (tasks.length === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10,
      }}
    >
      {tasks.map((task) => (
        <DayCard
          key={task.id}
          task={task}
          onRetry={onRetry}
          onPublish={onPublish}
        />
      ))}
    </div>
  );
}
