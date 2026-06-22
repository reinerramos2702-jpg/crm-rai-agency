'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  FileText,
  HelpCircle,
  Table as TableIcon,
  Globe,
  File as FileIcon,
  Bot,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface KB {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number; triggers: number };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BaseConocimientoPage() {
  const [bases, setBases] = useState<KB[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function fetchBases() {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge-bases');
      if (res.ok) {
        const data = await res.json();
        setBases(data.knowledgeBases || []);
      } else {
        toast.error('Error al cargar bases de conocimiento.');
      }
    } catch {
      toast.error('Error de red al cargar bases de conocimiento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBases();
  }, []);

  async function createBase() {
    setCreating(true);
    try {
      const res = await fetch('/api/knowledge-bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, description: description.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setBases((prev) => [data.knowledgeBase, ...prev]);
        toast.success('Base de conocimiento creada.');
        setShowModal(false);
        setName('');
        setDescription('');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setCreating(false);
    }
  }

  async function deleteBase(kb: KB) {
    const usedBy = kb._count?.triggers ?? 0;
    const msg =
      usedBy > 0
        ? `"${kb.name}" está vinculada a ${usedBy} agente(s). ¿Eliminarla de todas formas? Se desvinculará automáticamente.`
        : `¿Eliminar la base de conocimiento "${kb.name}"? Se borrarán sus ${kb._count?.items ?? 0} elementos.`;
    if (!confirm(msg)) return;
    setBusyId(kb.id);
    try {
      const res = await fetch(`/api/knowledge-bases/${kb.id}`, { method: 'DELETE' });
      if (res.ok) {
        setBases((prev) => prev.filter((b) => b.id !== kb.id));
        toast.success('Base de conocimiento eliminada.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container">
      <div className="mb-6">
        <Link href="/agentes-ia" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
          <ArrowLeft size={14} /> Agentes de IA
        </Link>
        <div className="row-between">
          <div>
            <h1 className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BookOpen size={22} color="var(--rai-gold)" />
              Base de conocimiento
            </h1>
            <p className="muted">
              Entrena a tus agentes con FAQs, texto enriquecido, tablas, archivos y páginas web rastreadas.
            </p>
          </div>
          <button className="primary" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Nueva base de conocimiento
          </button>
        </div>
      </div>

      {loading ? (
        <div className="row" style={{ justifyContent: 'center', padding: 60 }}>
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : bases.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <BookOpen size={36} className="muted" style={{ marginBottom: 12 }} />
          <h3 className="h3">Sin bases de conocimiento</h3>
          <p className="muted">Crea tu primera base de conocimiento para entrenar a tus agentes de IA.</p>
          <button className="primary mt-4" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Nueva base de conocimiento
          </button>
        </div>
      ) : (
        <div className="grid grid-3">
          {bases.map((kb) => {
            const itemCount = kb._count?.items ?? 0;
            const triggerCount = kb._count?.triggers ?? 0;
            return (
              <div key={kb.id} className="card">
                <div className="row-between mb-2">
                  <div className="row" style={{ gap: 8 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'rgba(201,168,76,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BookOpen size={18} color="var(--rai-gold)" />
                    </div>
                    <div>
                      <Link href={`/agentes-ia/base-conocimiento/${kb.id}`} style={{ fontWeight: 600, color: 'var(--rai-text)' }}>
                        {kb.name}
                      </Link>
                      <div className="muted" style={{ fontSize: 12 }}>Actualizado {fmtDate(kb.updatedAt)}</div>
                    </div>
                  </div>
                  <button
                    className="btn-sm btn-icon danger"
                    onClick={() => deleteBase(kb)}
                    disabled={busyId === kb.id}
                    title="Eliminar"
                  >
                    {busyId === kb.id ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
                  </button>
                </div>
                {kb.description && <p className="muted" style={{ fontSize: 13, minHeight: 36 }}>{kb.description}</p>}
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <span className="badge-gold">{itemCount} {itemCount === 1 ? 'elemento' : 'elementos'}</span>
                  {triggerCount > 0 && (
                    <span className="badge-success">
                      <Bot size={11} /> {triggerCount} {triggerCount === 1 ? 'agente' : 'agentes'}
                    </span>
                  )}
                </div>
                <Link href={`/agentes-ia/base-conocimiento/${kb.id}`}>
                  <button className="secondary w-full mt-4">Administrar contenido</button>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Leyenda de tipos de contenido soportados */}
      <div className="card mt-6">
        <div className="card-header">
          <span style={{ fontWeight: 600 }}>Tipos de contenido soportados</span>
        </div>
        <div className="grid grid-auto" style={{ gap: 12 }}>
          {[
            { icon: Globe, label: 'Rastreador web', desc: 'Vincula páginas web cuyo texto se usará como contexto.' },
            { icon: HelpCircle, label: 'FAQs', desc: 'Preguntas y respuestas frecuentes.' },
            { icon: TableIcon, label: 'Tablas', desc: 'Datos estructurados en filas y columnas (precios, horarios, etc).' },
            { icon: FileText, label: 'Texto enriquecido', desc: 'Bloques de texto libre con información de referencia.' },
            { icon: FileIcon, label: 'Archivos', desc: 'Documentos cuyo contenido se transcribe como texto.' },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="panel">
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <Icon size={15} color="var(--rai-gold)" />
                  <strong style={{ fontSize: 13 }}>{t.label}</strong>
                </div>
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>{t.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row-between mb-4">
              <h3 style={{ margin: 0 }}>Nueva base de conocimiento</h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </div>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input" placeholder="Ej: FAQs generales del hotel" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Descripción (opcional)</label>
              <textarea className="input" placeholder="¿Qué tipo de información contendrá esta base?" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button className="ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="primary" onClick={createBase} disabled={creating}>
                {creating ? <Loader2 className="animate-spin" size={14} /> : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
