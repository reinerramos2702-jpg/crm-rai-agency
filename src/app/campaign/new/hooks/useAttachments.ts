'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import toast from 'react-hot-toast';
import { isReadableText, type AttachmentInfo } from '@/lib/campaign-chat';

export interface UploadedFile extends AttachmentInfo {
  id: number;
  /** `reading` mientras se lee el contenido de un archivo de texto. */
  status: 'reading' | 'ready';
  /** 0–100. */
  progress: number;
}

function readText(file: File, onProgress: (pct: number) => void): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsText(file);
  });
}

/** Adjuntos del chat: lectura con progreso y arrastrar-y-soltar sobre el contenedor indicado. */
export function useAttachments() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const patch = useCallback((id: number, change: Partial<UploadedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...change } : f)));
  }, []);

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const incoming = Array.from(list);
      const entries = incoming.map((f) => {
        const readable = isReadableText({ type: f.type, name: f.name, size: f.size });
        const entry: UploadedFile = {
          id: nextId.current++,
          name: f.name,
          sizeBytes: f.size,
          type: f.type || 'application/octet-stream',
          status: readable ? 'reading' : 'ready',
          progress: readable ? 0 : 100,
        };
        return { file: f, entry, readable };
      });
      setFiles((prev) => [...prev, ...entries.map((e) => e.entry)]);
      toast.success(`${incoming.length} archivo(s) adjunto(s)`);

      await Promise.all(
        entries
          .filter((e) => e.readable)
          .map(async ({ file, entry }) => {
            const content = await readText(file, (progress) => patch(entry.id, { progress }));
            patch(entry.id, { content, status: 'ready', progress: 100 });
          }),
      );
    },
    [patch],
  );

  const removeFile = useCallback((id: number) => setFiles((prev) => prev.filter((f) => f.id !== id)), []);
  const clear = useCallback(() => setFiles([]), []);

  const dropHandlers = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dropRef.current?.contains(e.relatedTarget as Node)) setIsDragging(false);
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop: async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) await addFiles(e.dataTransfer.files);
    },
  };

  return {
    files,
    isReading: files.some((f) => f.status === 'reading'),
    isDragging,
    dropRef,
    dropHandlers,
    addFiles,
    removeFile,
    clear,
  };
}

export type Attachments = ReturnType<typeof useAttachments>;
