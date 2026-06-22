'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BookOpen,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  FileText,
  HelpCircle,
  Table as TableIcon,
  Globe,
  File as FileIcon,
  Bot,
  X,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

type ItemType = 'faq' | 'text' | 'table' | 'file' | 'url';

interface KBItem {
  id: string;
  type: ItemType;
  question: string | null;
  answer: string | null;
  title: string | null;
  content: string | null;
  data: { columns?: string[]; rows?: string[][] } | null;
  createdAt: string;
  updatedAt: string;
}

interface KBDetail {
  id: string;
  name: string;
  description: string | null;
  items: KBItem[];
  triggers: { id: string; agent: { id: string; name: string; kind: string; status: string } }[];
}

const ITEM_TABS = [
  { id: 'faq', label: 'FAQs', icon: HelpCircle },
  { id: 'text', label: 'Texto enriquecido', icon: FileText },
  { id: 'table', label: 'Tablas', icon: TableIcon },
  { id: 'file', label: 'Archivos', icon: FileIcon },
  { id: 'url', label: 'Rastreador web', icon: Globe },
] as const;

type ItemTab = (typeof ITEM_TABS)[number]['id'];

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  suggested: 'badge-gold',
  disabled: 'badge-muted',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  suggested: 'Sugerido',
  disabled: 'Apagado',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function KBDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [kb, setKb] = useState<KBDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ItemTab>('faq');
  const [editingHeader, setEditingHeader] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KBItem | null>(null);

  const fetchKB = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${id}`);
      if (res.ok) {
        const data = await res.json();
        setKb(data.knowledgeBase);
      } else if (res.status === 404) {
        toast.error('Base de conocimiento no encontrada.');
      } else {
        toast.error('Error al cargar la base de conocimiento.');
      }
    } catch {
      toast.error('Error de red al cargar la base de conocimiento.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchKB();
  }, [fetchKB]);

  function startEditHeader() {
    if (!kb) return;
    setNameDraft(kb.name);
    setDescDraft(kb.description || '');
    setEditingHeader(true);
  }

  async function saveHeader() {
    if (!kb) return;
    setSavingHeader(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${kb.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft.trim() || kb.name, description: descDraft.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setKb((prev) => (prev ? { ...prev, name: data.knowledgeBase.name, description: data.knowledgeBase.description } : prev));
        setEditingHeader(false);
        toast.success('Base de conocimiento actualizada.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setSavingHeader(false);
    }
  }

  async function deleteItem(item: KBItem) {
    if (!kb) return;
    if (!confirm('¿Eliminar este elemento de la base de conocimiento?')) return;
    try {
      const res = await fetch(`/api/knowledge-bases/${kb.id}/items/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        setKb((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) } : prev));
        toast.success('Elemento eliminado.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    }
  }

  function openCreate() {
    setEditingItem(null);
    setShowModal(true);
  }
  function openEdit(item: KBItem) {
    setEditingItem(item);
    setShowModal(true);
  }
  function handleSaved(item: KBItem) {
    setKb((prev) => {
      if (!prev) return prev;
      const exists = prev.items.some((i) => i.id === item.id);
      return { ...prev, items: exists ? prev.items.map((i) => (i.id === item.id ? item : i)) : [...prev.items, item] };
    });
    setShowModal(false);
    setEditingItem(null);
  }

  if (loading) {
    return (
      <div className="container">
        <div className="row" style={{ justifyContent: 'center', padding: 60 }}>
          <Loader2 className="animate-spin" size={24} />
        </div>
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="container">
        <p className="muted">Base de conocimiento no encontrada.</p>
        <Link href="/agentes-ia/base-conocimiento"><button className="secondary mt-4"><ArrowLeft size={14} /> Volver</button></Link>
      </div>
    );
  }

  const itemsByType = (t: ItemType) => kb.items.filter((i) => i.type === t);

  return (
    <div className="container">
      <div className="mb-6">
        <Link href="/agentes-ia/base-conocimiento" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
          <ArrowLeft size={14} /> Base de conocimiento
        </Link>

        {editingHeader ? (
          <div className="card" style={{ maxWidth: 520 }}>
            <div className="form-group">
              <label>Nombre</label>
              <input className="input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea className="input" value={descDraft} onChange={(e) => setDescDraft(e.target.value)} />
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="primary" onClick={saveHeader} disabled={savingHeader}>
                {savingHeader ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Guardar
              </button>
              <button className="ghost" onClick={() => setEditingHeader(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="row-between">
            <div>
              <h1 className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BookOpen size={22} color="var(--rai-gold)" />
                {kb.name}
                <button className="btn-sm btn-icon ghost" onClick={startEditHeader} title="Editar"><Edit2 size={13} /></button>
              </h1>
              {kb.description && <p className="muted">{kb.description}</p>}
              {kb.triggers.length > 0 && (
                <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span className="muted" style={{ fontSize: 12 }}>Usada por:</span>
                  {kb.triggers.map((t) => (
                    <Link key={t.id} href={`/agentes-ia/${t.agent.id}`} className={STATUS_BADGE[t.agent.status] || 'badge-muted'} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Bot size={11} /> {t.agent.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub tabs por tipo de contenido */}
      <div className="row mb-6" style={{ gap: 8, borderBottom: '1px solid var(--rai-border)', flexWrap: 'wrap' }}>
        {ITEM_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const count = itemsByType(tab.id).length;
          return (
            <button
              key={tab.id}
              className="ghost"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid var(--rai-border)',
                borderBottom: active ? '3px solid var(--rai-gold)' : '1px solid var(--rai-border)',
                color: active ? 'var(--rai-gold)' : 'var(--rai-muted)',
                fontWeight: active ? 600 : 400,
                background: active ? 'var(--rai-card)' : 'transparent',
              }}
            >
              <Icon size={15} />
              {tab.label}
              {count > 0 && <span className="badge-muted" style={{ fontSize: 10 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <span style={{ fontWeight: 600 }}>{ITEM_TABS.find((t) => t.id === activeTab)?.label}</span>
          <button className="primary" onClick={openCreate}>
            <Plus size={14} /> Agregar
          </button>
        </div>

        <ItemList items={itemsByType(activeTab)} type={activeTab} onEdit={openEdit} onDelete={deleteItem} />
      </div>

      {showModal && (
        <ItemModal
          kbId={kb.id}
          type={activeTab}
          item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ============================================================
// Lista de elementos por tipo
// ============================================================
function ItemList({ items, type, onEdit, onDelete }: { items: KBItem[]; type: ItemType; onEdit: (i: KBItem) => void; onDelete: (i: KBItem) => void }) {
  if (items.length === 0) {
    const EMPTY_COPY: Record<ItemType, string> = {
      faq: 'No hay preguntas frecuentes. Agrega pares de pregunta y respuesta para que el agente responda con precisión.',
      text: 'No hay bloques de texto. Agrega información de referencia en texto libre.',
      table: 'No hay tablas. Agrega datos estructurados como precios, horarios o disponibilidad.',
      file: 'No hay archivos. Agrega documentos y su contenido en texto para que el agente los consulte.',
      url: 'No hay páginas web vinculadas. Agrega URLs para que el agente use su contenido como referencia.',
    };
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p className="muted">{EMPTY_COPY[type]}</p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 10 }}>
      {items.map((item) => (
        <div key={item.id} className="panel">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {item.type === 'faq' && (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.question}</div>
                  <p className="muted" style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>{item.answer}</p>
                </>
              )}
              {item.type === 'text' && (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title || 'Sin título'}</div>
                  <p className="muted" style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {(item.content || '').slice(0, 280)}{(item.content || '').length > 280 ? '…' : ''}
                  </p>
                </>
              )}
              {item.type === 'table' && (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{item.title || 'Sin título'}</div>
                  <TablePreview data={item.data} />
                </>
              )}
              {item.type === 'file' && (
                <>
                  <div className="row" style={{ gap: 6, fontWeight: 600, marginBottom: 4 }}>
                    <FileIcon size={14} /> {item.title || 'Archivo sin nombre'}
                  </div>
                  <p className="muted" style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {item.content ? `${item.content.slice(0, 200)}${item.content.length > 200 ? '…' : ''}` : 'Sin contenido extraído.'}
                  </p>
                </>
              )}
              {item.type === 'url' && (
                <>
                  <div className="row" style={{ gap: 6, fontWeight: 600, marginBottom: 4 }}>
                    <Globe size={14} />
                    <a href={item.content || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--rai-gold)' }}>
                      {item.title || item.content}
                    </a>
                  </div>
                  {item.title && <p className="muted" style={{ fontSize: 12, margin: 0 }}>{item.content}</p>}
                </>
              )}
              <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Actualizado {fmtDate(item.updatedAt)}</div>
            </div>
            <div className="row" style={{ gap: 6, flexShrink: 0 }}>
              <button className="btn-sm btn-icon ghost" onClick={() => onEdit(item)} title="Editar"><Edit2 size={13} /></button>
              <button className="btn-sm btn-icon danger" onClick={() => onDelete(item)} title="Eliminar"><Trash2 size={13} /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TablePreview({ data }: { data: KBItem['data'] }) {
  const columns = data?.columns || [];
  const rows = data?.rows || [];
  if (columns.length === 0) return <p className="muted" style={{ fontSize: 12 }}>Tabla vacía.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((c, i) => <th key={i}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 5).map((row, ri) => (
            <tr key={ri}>
              {columns.map((_, ci) => <td key={ci}>{row[ci] ?? ''}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 5 && <p className="muted" style={{ fontSize: 11, margin: '4px 0 0' }}>+{rows.length - 5} filas más</p>}
    </div>
  );
}

// ============================================================
// Modal de creación / edición de elementos
// ============================================================
function ItemModal({
  kbId,
  type,
  item,
  onClose,
  onSaved,
}: {
  kbId: string;
  type: ItemType;
  item: KBItem | null;
  onClose: () => void;
  onSaved: (item: KBItem) => void;
}) {
  const isEdit = !!item;

  const [question, setQuestion] = useState(item?.question || '');
  const [answer, setAnswer] = useState(item?.answer || '');
  const [title, setTitle] = useState(item?.title || '');
  const [content, setContent] = useState(item?.content || '');
  const [columns, setColumns] = useState<string[]>(item?.data?.columns?.length ? item.data.columns : ['Columna 1', 'Columna 2']);
  const [rows, setRows] = useState<string[][]>(item?.data?.rows?.length ? item.data.rows : [['', '']]);
  const [saving, setSaving] = useState(false);

  const TITLES: Record<ItemType, string> = {
    faq: isEdit ? 'Editar pregunta frecuente' : 'Nueva pregunta frecuente',
    text: isEdit ? 'Editar texto' : 'Nuevo bloque de texto',
    table: isEdit ? 'Editar tabla' : 'Nueva tabla',
    file: isEdit ? 'Editar archivo' : 'Nuevo archivo',
    url: isEdit ? 'Editar página web' : 'Nueva página web',
  };

  function addColumn() {
    setColumns((prev) => [...prev, `Columna ${prev.length + 1}`]);
    setRows((prev) => prev.map((r) => [...r, '']));
  }
  function removeColumn(idx: number) {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((_, i) => i !== idx));
    setRows((prev) => prev.map((r) => r.filter((_, i) => i !== idx)));
  }
  function addRow() {
    setRows((prev) => [...prev, columns.map(() => '')]);
  }
  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateCell(ri: number, ci: number, value: string) {
    setRows((prev) => prev.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? value : c)) : r)));
  }
  function updateColumnName(idx: number, value: string) {
    setColumns((prev) => prev.map((c, i) => (i === idx ? value : c)));
  }

  function validate(): string | null {
    if (type === 'faq') {
      if (!question.trim()) return 'La pregunta es requerida.';
      if (!answer.trim()) return 'La respuesta es requerida.';
    }
    if (type === 'text') {
      if (!content.trim()) return 'El contenido es requerido.';
    }
    if (type === 'table') {
      if (!title.trim()) return 'El título de la tabla es requerido.';
      if (columns.some((c) => !c.trim())) return 'Todas las columnas necesitan un nombre.';
    }
    if (type === 'file') {
      if (!title.trim()) return 'El nombre del archivo es requerido.';
    }
    if (type === 'url') {
      if (!content.trim()) return 'La URL es requerida.';
      if (!/^https?:\/\//i.test(content.trim())) return 'La URL debe comenzar con http:// o https://';
    }
    return null;
  }

  async function save() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const body: Record<string, unknown> = { type };
    if (type === 'faq') {
      body.question = question.trim();
      body.answer = answer;
    } else if (type === 'text') {
      body.title = title.trim();
      body.content = content;
    } else if (type === 'table') {
      body.title = title.trim();
      body.data = { columns, rows };
    } else if (type === 'file') {
      body.title = title.trim();
      body.content = content;
    } else if (type === 'url') {
      body.title = title.trim() || content.trim();
      body.content = content.trim();
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/knowledge-bases/${kbId}/items/${item!.id}` : `/api/knowledge-bases/${kbId}/items`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        onSaved(data.item);
        toast.success(isEdit ? 'Elemento actualizado.' : 'Elemento agregado.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Error del servidor (${res.status})`);
      }
    } catch {
      toast.error('Error de red: no se pudo contactar al servidor.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: type === 'table' ? 720 : 560 }}>
        <div className="row-between mb-4">
          <h3 style={{ margin: 0 }}>{TITLES[type]}</h3>
          <X size={18} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        {type === 'faq' && (
          <>
            <div className="form-group">
              <label>Pregunta</label>
              <input className="input" placeholder="¿Cuál es el horario de check-in?" value={question} onChange={(e) => setQuestion(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Respuesta</label>
              <textarea className="input" style={{ minHeight: 120 }} placeholder="El check-in es a partir de las 3:00 pm..." value={answer} onChange={(e) => setAnswer(e.target.value)} />
            </div>
          </>
        )}

        {type === 'text' && (
          <>
            <div className="form-group">
              <label>Título</label>
              <input className="input" placeholder="Ej: Políticas de cancelación" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Contenido</label>
              <textarea className="input" style={{ minHeight: 180 }} placeholder="Escribe aquí la información que el agente debe conocer..." value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
          </>
        )}

        {type === 'table' && (
          <>
            <div className="form-group">
              <label>Título de la tabla</label>
              <input className="input" placeholder="Ej: Tarifas por temporada" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Datos</label>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      {columns.map((c, ci) => (
                        <th key={ci}>
                          <div className="row" style={{ gap: 4 }}>
                            <input className="input btn-sm" style={{ minWidth: 80 }} value={c} onChange={(e) => updateColumnName(ci, e.target.value)} />
                            {columns.length > 1 && (
                              <button className="btn-sm btn-icon danger" onClick={() => removeColumn(ci)} title="Eliminar columna"><X size={11} /></button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th style={{ width: 1 }}>
                        <button className="btn-sm btn-icon secondary" onClick={addColumn} title="Agregar columna"><Plus size={12} /></button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri}>
                        {columns.map((_, ci) => (
                          <td key={ci}>
                            <input className="input btn-sm" style={{ minWidth: 80 }} value={row[ci] ?? ''} onChange={(e) => updateCell(ri, ci, e.target.value)} />
                          </td>
                        ))}
                        <td>
                          <button className="btn-sm btn-icon danger" onClick={() => removeRow(ri)} title="Eliminar fila"><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="secondary btn-sm mt-2" onClick={addRow}><Plus size={12} /> Agregar fila</button>
            </div>
          </>
        )}

        {type === 'file' && (
          <>
            <div className="form-group">
              <label>Nombre del archivo</label>
              <input className="input" placeholder="Ej: Reglamento_interno.pdf" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Contenido extraído (opcional)</label>
              <textarea className="input" style={{ minHeight: 160 }} placeholder="Pega aquí el texto del documento para que el agente pueda usarlo como referencia..." value={content} onChange={(e) => setContent(e.target.value)} />
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                El agente usará este texto como contexto. Si dejas este campo vacío, solo se registrará el nombre del archivo.
              </p>
            </div>
          </>
        )}

        {type === 'url' && (
          <>
            <div className="form-group">
              <label>URL</label>
              <input className="input" placeholder="https://www.tuempresa.com/preguntas-frecuentes" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Etiqueta (opcional)</label>
              <input className="input" placeholder="Ej: Página de preguntas frecuentes" value={title} onChange={(e) => setTitle(e.target.value)} />
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Por ahora el rastreador web registra la URL como referencia; el agente la mostrará como fuente.
              </p>
            </div>
          </>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="ghost" onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : isEdit ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
