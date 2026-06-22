'use client';

import React, { useState } from 'react';
import {
  Users,
  Layers,
  ListChecks,
  CheckSquare,
  Building2,
  Plus,
  Upload,
  MoreVertical,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Settings,
  Filter,
  ChevronDown,
  Inbox,
  Pencil,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TOP_TABS = [
  { id: 'listas', label: 'Listas inteligentes', icon: Layers },
  { id: 'lote', label: 'Acciones en lote', icon: ListChecks },
  { id: 'tareas', label: 'Tareas', icon: CheckSquare },
  { id: 'empresas', label: 'Empresas', icon: Building2 },
] as const;

type TopTab = (typeof TOP_TABS)[number]['id'];

// ─────────────────────────────────────────────────────────────────────────────
// Empty state helper
// ─────────────────────────────────────────────────────────────────────────────
function EmptyRow({ icon: Icon, title, hint }: { icon: any; title: string; hint: string }) {
  return (
    <div
      style={{
        padding: '64px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        color: 'var(--rai-muted)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid var(--rai-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} color="var(--rai-gold)" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--rai-text)', marginTop: 4 }}>{title}</div>
      <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 360 }}>{hint}</div>
    </div>
  );
}

function Pager({ total, pageSize = 20 }: { total: number; pageSize?: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="row-between" style={{ padding: '12px 4px', fontSize: 12, color: 'var(--rai-muted)' }}>
      <span>Página 1 de {pages}</span>
      <div className="row" style={{ gap: 8 }}>
        <select className="input" style={{ height: 28, padding: '0 8px', fontSize: 12 }}>
          <option>20</option>
          <option>50</option>
          <option>100</option>
        </select>
        <button className="ghost btn-sm" disabled>Previo</button>
        <button className="primary btn-sm">1</button>
        <button className="ghost btn-sm" disabled>Siguiente</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Listas inteligentes
// ─────────────────────────────────────────────────────────────────────────────
function ListasInteligentes() {
  const [subTab, setSubTab] = useState<'todo' | 'nueva'>('todo');

  return (
    <div>
      {/* Header */}
      <div className="row-between mb-4" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <h2 className="h2" style={{ margin: 0 }}>Contactos</h2>
          <span className="badge badge-gold">0 Contactos</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary" onClick={() => toast('Próximamente')}>
            <Upload size={14} /> Importar
          </button>
          <button className="primary" onClick={() => toast('Próximamente')}>
            <Plus size={14} /> Agregar Contacto
          </button>
          <button className="ghost btn-icon" aria-label="Más acciones">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="row" style={{ gap: 4, borderBottom: '1px solid var(--rai-border)', marginBottom: 16 }}>
        <button
          className="ghost"
          onClick={() => setSubTab('todo')}
          style={{
            padding: '10px 14px',
            borderBottom: subTab === 'todo' ? '2px solid var(--rai-gold)' : '2px solid transparent',
            color: subTab === 'todo' ? 'var(--rai-gold)' : 'var(--rai-muted)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Layers size={14} /> Todo
        </button>
        <button
          className="ghost"
          onClick={() => toast('Próximamente')}
          style={{ padding: '10px 14px', color: 'var(--rai-muted)', fontSize: 13 }}
        >
          <Plus size={14} /> Añadir lista inteligente
        </button>
      </div>

      {/* Filter bar */}
      <div className="row-between mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary btn-sm">
            <SlidersHorizontal size={14} /> Filtros avanzados
          </button>
          <button className="secondary btn-sm">
            <ArrowUpDown size={14} /> Ordenar
          </button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 10, top: 9, color: 'var(--rai-muted)' }}
            />
            <input
              className="input"
              placeholder="Buscar Contactos"
              style={{ paddingLeft: 30, width: 240, height: 32 }}
            />
          </div>
          <button className="secondary btn-sm">
            <Settings size={14} /> Administrar campos
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" /></th>
              <th>Nombre de Contacto</th>
              <th>Teléfono</th>
              <th>Correo electrónico</th>
              <th>Nombre de la empresa</th>
              <th>Creado (-04)</th>
              <th>Última actividad (-04)</th>
              <th>Etiquetas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} style={{ padding: 0 }}>
                <EmptyRow
                  icon={Users}
                  title="Aún no tienes contactos"
                  hint="Importa tu lista existente o agrega tu primer contacto para empezar."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pager total={0} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Acciones en lote
// ─────────────────────────────────────────────────────────────────────────────
function AccionesEnLote() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="h2" style={{ margin: 0 }}>Acciones en bloque</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          Haga un seguimiento del progreso y los resultados de las acciones en lote.
        </p>
      </div>

      {/* Filters */}
      <div className="row mb-4" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="muted" style={{ fontSize: 12 }}>Filtros</span>
        <input type="date" className="input" style={{ height: 32, width: 150 }} />
        <input type="date" className="input" style={{ height: 32, width: 150 }} />
        <select className="input" style={{ height: 32, width: 180 }}>
          <option>Todos los estados</option>
        </select>
        <select className="input" style={{ height: 32, width: 180 }}>
          <option>Todas las acciones</option>
        </select>
        <select className="input" style={{ height: 32, width: 180 }}>
          <option>Todos los usuarios</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Etiqueta de acción</th>
              <th>Operación</th>
              <th>Estado</th>
              <th>Usuario</th>
              <th>Creado (GMT -04)</th>
              <th>Completado (GMT -04)</th>
              <th>Estadísticas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} style={{ padding: 0 }}>
                <EmptyRow
                  icon={Inbox}
                  title="No se han encontrado acciones en lote"
                  hint="No hay acciones en lote que coincidan con sus filtros actuales."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pager total={0} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Tareas
// ─────────────────────────────────────────────────────────────────────────────
function Tareas() {
  const SUB = [
    { id: 'todo', label: 'Todo' },
    { id: 'hoy', label: 'Vence hoy' },
    { id: 'atrasado', label: 'Atrasado' },
    { id: 'proximos', label: 'Próximos' },
  ] as const;
  const [sub, setSub] = useState<(typeof SUB)[number]['id']>('todo');

  return (
    <div>
      <div className="row-between mb-4" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <h2 className="h2" style={{ margin: 0 }}>Tareas</h2>
          <span className="badge badge-gold">0 Tareas</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="primary" onClick={() => toast('Próximamente')}>
            <Plus size={14} /> Agregar Tarea
          </button>
          <button className="ghost btn-icon" aria-label="Más">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 4, borderBottom: '1px solid var(--rai-border)', marginBottom: 16 }}>
        {SUB.map((s) => (
          <button
            key={s.id}
            className="ghost"
            onClick={() => setSub(s.id)}
            style={{
              padding: '10px 14px',
              borderBottom: sub === s.id ? '2px solid var(--rai-gold)' : '2px solid transparent',
              color: sub === s.id ? 'var(--rai-gold)' : 'var(--rai-muted)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {s.label}
          </button>
        ))}
        <button
          className="ghost"
          onClick={() => toast('Próximamente')}
          style={{ padding: '10px 14px', color: 'var(--rai-muted)', fontSize: 13 }}
        >
          <Plus size={14} /> Lista
        </button>
      </div>

      <div className="row-between mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary btn-sm">
            <Users size={14} /> Responsable: Cualquiera <ChevronDown size={12} />
          </button>
          <button className="secondary btn-sm">
            <CheckSquare size={14} /> Estado: Todo <ChevronDown size={12} />
          </button>
          <button className="secondary btn-sm">
            <Filter size={14} /> Debido a fecha: Cualquiera <ChevronDown size={12} />
          </button>
          <button className="secondary btn-sm">
            <SlidersHorizontal size={14} /> Filtros avanzados
          </button>
          <button className="secondary btn-sm">
            <ArrowUpDown size={14} /> Ordenar
          </button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--rai-muted)' }} />
            <input className="input" placeholder="Buscar tarea por título" style={{ paddingLeft: 30, width: 240, height: 32 }} />
          </div>
          <button className="secondary btn-sm">
            <Settings size={14} /> Administrar campos
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" /></th>
              <th>Estado</th>
              <th>Título</th>
              <th>Descripción</th>
              <th>Contactos asociados</th>
              <th>Responsable</th>
              <th>Vencimiento (-04)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} style={{ padding: 0 }}>
                <EmptyRow
                  icon={CheckSquare}
                  title="No tienes tareas todavía"
                  hint="Crea tu primera tarea para hacer seguimiento de pendientes asociados a tus contactos."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pager total={0} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Empresas
// ─────────────────────────────────────────────────────────────────────────────
function Empresas() {
  return (
    <div>
      <div className="row-between mb-4" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <h2 className="h2" style={{ margin: 0 }}>Empresas</h2>
          <span className="badge badge-gold">0 Empresas</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary" onClick={() => toast('Próximamente')}>
            <Upload size={14} /> Importar
          </button>
          <button className="primary" onClick={() => toast('Próximamente')}>
            <Plus size={14} /> Agregar Empresa
          </button>
          <button className="ghost btn-icon" aria-label="Más">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 4, borderBottom: '1px solid var(--rai-border)', marginBottom: 16 }}>
        <button
          className="ghost"
          style={{
            padding: '10px 14px',
            borderBottom: '2px solid var(--rai-gold)',
            color: 'var(--rai-gold)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Layers size={14} /> Todo
        </button>
        <button
          className="ghost"
          onClick={() => toast('Próximamente')}
          style={{ padding: '10px 14px', color: 'var(--rai-muted)', fontSize: 13 }}
        >
          <Plus size={14} /> Lista
        </button>
      </div>

      <div className="row-between mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary btn-sm">
            <SlidersHorizontal size={14} /> Filtros avanzados
          </button>
          <button className="secondary btn-sm">
            <ArrowUpDown size={14} /> Ordenar
          </button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--rai-muted)' }} />
            <input className="input" placeholder="Buscar" style={{ paddingLeft: 30, width: 240, height: 32 }} />
          </div>
          <button className="secondary btn-sm">
            <Settings size={14} /> Administrar campos
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" /></th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Sitio web</th>
              <th>Dirección</th>
              <th>Región</th>
              <th>Ciudad</th>
              <th>País</th>
              <th>Creado</th>
              <th>Actualizado</th>
              <th>Creado por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={13} style={{ padding: 0 }}>
                <EmptyRow
                  icon={Building2}
                  title="Aún no tienes empresas"
                  hint="Agrega tu primera empresa para vincular contactos, oportunidades y facturación."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pager total={0} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ContactosPage() {
  const [tab, setTab] = useState<TopTab>('listas');

  return (
    <div className="container">
      {/* Page heading */}
      <div className="row mb-4" style={{ gap: 10, alignItems: 'center' }}>
        <Users size={20} color="var(--rai-gold)" />
        <h1 className="h1" style={{ margin: 0 }}>Contactos</h1>
      </div>

      {/* Top tabs */}
      <div
        className="row"
        style={{
          gap: 4,
          borderBottom: '1px solid var(--rai-border)',
          marginBottom: 24,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {TOP_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="ghost"
            style={{
              padding: '12px 16px',
              borderBottom: tab === id ? '2px solid var(--rai-gold)' : '2px solid transparent',
              color: tab === id ? 'var(--rai-gold)' : 'var(--rai-muted)',
              fontSize: 14,
              fontWeight: tab === id ? 600 : 500,
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <button className="ghost btn-icon" aria-label="Configuración de Contactos" onClick={() => toast('Próximamente')}>
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Tab content */}
      {tab === 'listas' && <ListasInteligentes />}
      {tab === 'lote' && <AccionesEnLote />}
      {tab === 'tareas' && <Tareas />}
      {tab === 'empresas' && <Empresas />}
    </div>
  );
}
