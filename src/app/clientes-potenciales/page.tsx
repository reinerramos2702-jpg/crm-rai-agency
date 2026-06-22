'use client';

import React, { useState } from 'react';
import {
  Target,
  LayoutGrid,
  List,
  Upload,
  Plus,
  MoreVertical,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Settings,
  ChevronDown,
  X,
  TrendingUp,
  Workflow,
  ListChecks,
  FileText,
  GripVertical,
  Phone,
  Mail,
  CalendarCheck,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TOP_TABS = [
  { id: 'oportunidades', label: 'Clientes Potenciales', icon: Target },
  { id: 'pronostico', label: 'Pronóstico', icon: TrendingUp },
  { id: 'secuencia', label: 'Secuencia', icon: Workflow },
  { id: 'lote', label: 'Acciones en lote', icon: ListChecks },
] as const;
type TopTab = (typeof TOP_TABS)[number]['id'];

interface Stage {
  id: string;
  label: string;
  color: string;
  bg: string;
}

const STAGES: Stage[] = [
  { id: 'nuevo', label: 'Nuevo Lead', color: '#5b8def', bg: 'rgba(91,141,239,0.18)' },
  { id: 'contacto', label: 'Contacto Inicial', color: '#3fb89a', bg: 'rgba(63,184,154,0.18)' },
  { id: 'consulta', label: 'Consulta / Cotización', color: '#a78bfa', bg: 'rgba(167,139,250,0.18)' },
  { id: 'propuesta', label: 'Propuesta Enviada', color: '#f87171', bg: 'rgba(248,113,113,0.18)' },
  { id: 'negociacion', label: 'En Negociación', color: '#fb923c', bg: 'rgba(251,146,60,0.18)' },
  { id: 'reserva', label: 'Reserva Confirmada', color: '#fdba74', bg: 'rgba(253,186,116,0.18)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Cat illustration empty state
// ─────────────────────────────────────────────────────────────────────────────
function CatEmpty() {
  return (
    <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Desk */}
      <rect x="20" y="80" width="120" height="30" rx="4" fill="var(--rai-card)" stroke="var(--rai-border)" />
      {/* Papers */}
      <rect x="32" y="55" width="22" height="28" rx="2" fill="var(--rai-card)" stroke="var(--rai-border)" />
      <line x1="35" y1="62" x2="50" y2="62" stroke="var(--rai-muted)" strokeWidth="0.6" />
      <line x1="35" y1="66" x2="50" y2="66" stroke="var(--rai-muted)" strokeWidth="0.6" />
      <line x1="35" y1="70" x2="48" y2="70" stroke="var(--rai-muted)" strokeWidth="0.6" />
      <rect x="58" y="50" width="22" height="33" rx="2" fill="var(--rai-card)" stroke="var(--rai-border)" />
      <line x1="61" y1="57" x2="76" y2="57" stroke="var(--rai-muted)" strokeWidth="0.6" />
      <line x1="61" y1="61" x2="76" y2="61" stroke="var(--rai-muted)" strokeWidth="0.6" />
      <line x1="61" y1="65" x2="74" y2="65" stroke="var(--rai-muted)" strokeWidth="0.6" />
      {/* Monitor */}
      <rect x="86" y="48" width="36" height="26" rx="2" fill="var(--rai-card)" stroke="var(--rai-border)" />
      <rect x="100" y="74" width="8" height="6" fill="var(--rai-card)" stroke="var(--rai-border)" />
      <line x1="93" y1="80" x2="115" y2="80" stroke="var(--rai-border)" strokeWidth="1" />
      {/* Cat */}
      <ellipse cx="68" cy="92" rx="14" ry="9" fill="var(--rai-border)" />
      <circle cx="62" cy="88" r="5" fill="var(--rai-muted)" />
      <polygon points="58,84 60,80 62,84" fill="var(--rai-muted)" />
      <polygon points="64,84 66,80 68,84" fill="var(--rai-muted)" />
      <circle cx="60.5" cy="88" r="0.7" fill="var(--rai-text)" />
      <circle cx="63.5" cy="88" r="0.7" fill="var(--rai-text)" />
      <path d="M61 90 Q 62 91 63 90" stroke="var(--rai-text)" strokeWidth="0.5" fill="none" />
      {/* Plant */}
      <rect x="128" y="92" width="12" height="14" rx="1.5" fill="var(--rai-card)" stroke="var(--rai-border)" />
      <path d="M134 92 Q 130 82 132 78 Q 136 80 134 92" fill="rgba(63,184,154,0.4)" />
      <path d="M134 92 Q 138 84 140 80 Q 136 84 134 92" fill="rgba(63,184,154,0.3)" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Añadir Oportunidad
// ─────────────────────────────────────────────────────────────────────────────
function AddOpportunityModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 880, width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row-between mb-4">
          <div>
            <h3 style={{ margin: 0 }}>Añadir una nueva oportunidad</h3>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Crea la oportunidad ingresando los detalles y seleccionando un contacto.
            </p>
          </div>
          <button className="ghost btn-icon" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'flex-start' }}>
          {/* Left sidebar */}
          <div className="card" style={{ padding: 12 }}>
            <button
              className="ghost"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                background: 'rgba(201,168,76,0.1)',
                color: 'var(--rai-gold)',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Información del cliente potencial
            </button>
            <button
              className="ghost"
              onClick={() => toast('Próximamente')}
              style={{
                width: '100%',
                textAlign: 'left',
                marginTop: 8,
                padding: '10px 12px',
                color: 'var(--rai-gold)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <Settings size={12} /> Añadir/Gestionar campos
            </button>
          </div>

          {/* Form */}
          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Contacto · Detalles</h4>

            <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
              <div className="form-group">
                <label className="label">Nombre del contacto principal *</label>
                <select className="input">
                  <option>Seleccionar contacto</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Correo electrónico principal</label>
                <input className="input" placeholder="Introducir correo electrónico" />
              </div>
            </div>
            <div className="form-group mb-4">
              <label className="label">Teléfono principal</label>
              <input className="input" placeholder="Introduce el número de teléfono" />
            </div>

            <h4 style={{ margin: '16px 0 12px 0', fontSize: 14 }}>Oportunidad · Detalles</h4>

            <div className="form-group mb-4">
              <label className="label">Nombre del cliente potencial *</label>
              <input className="input" placeholder="Introducir el nombre del cliente potencial" />
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="label">Secuencia</label>
                <select className="input">
                  <option>Embudo de Ventas Principal</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Paso</label>
                <select className="input">
                  {STAGES.map((s) => (
                    <option key={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="label">Estado</label>
                <select className="input">
                  <option>Abierto</option>
                  <option>Ganado</option>
                  <option>Perdido</option>
                  <option>Abandonado</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Valor</label>
                <input className="input" placeholder="€ 0" />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="label">Propietario</label>
                <select className="input">
                  <option>Sin asignar</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Seguidores</label>
                <input className="input" placeholder="Añadir seguidores" />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="label">Nombre del negocio</label>
                <input className="input" placeholder="Introducir nombre del negocio" />
              </div>
              <div className="form-group">
                <label className="label">Fuente</label>
                <input className="input" placeholder="Introducir fuente" />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="label">Fecha de cierre estimada</label>
                <input className="input" type="date" />
              </div>
              <div className="form-group">
                <label className="label">Etiquetas</label>
                <input className="input" placeholder="Añadir etiquetas" />
              </div>
            </div>
          </div>
        </div>

        <div className="row-between mt-4" style={{ borderTop: '1px solid var(--rai-border)', paddingTop: 16 }}>
          <div />
          <div className="row" style={{ gap: 8 }}>
            <button className="secondary" onClick={onClose}>Cancelar</button>
            <button className="primary" onClick={() => { toast.success('Oportunidad creada (placeholder)'); onClose(); }}>
              Crear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer: Personalizar la tarjeta
// ─────────────────────────────────────────────────────────────────────────────
function CustomizeCardDrawer({ onClose }: { onClose: () => void }) {
  const [design, setDesign] = useState<'default' | 'compact' | 'unlabeled'>('default');
  const [tab, setTab] = useState<'campos' | 'actividades'>('campos');

  const fields = [
    { id: 'name', label: 'Nombre del cliente potencial', locked: true, on: true },
    { id: 'tags', label: 'Etiquetas inteligentes', badge: 'Nuevo', on: true },
    { id: 'owner', label: 'Propietario de la oportunidad', on: true },
    { id: 'business', label: 'Nombre del negocio', on: true },
    { id: 'source', label: 'Fuente', on: true },
    { id: 'value', label: 'Valor', on: true },
    { id: 'reason', label: 'Razón de abandono', on: true },
  ];

  return (
    <div
      className="modal-backdrop"
      style={{ justifyContent: 'flex-end', alignItems: 'stretch' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          height: '100vh',
          background: 'var(--rai-dark)',
          borderLeft: '1px solid var(--rai-border)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="row-between" style={{ padding: 20, borderBottom: '1px solid var(--rai-border)' }}>
          <h3 style={{ margin: 0 }}>Personalizar la tarjeta</h3>
          <button className="ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Vista previa */}
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Vista previa de la tarjeta</div>
          <div className="card" style={{ marginBottom: 20, padding: 12 }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Nombre de la oportunidad</div>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--rai-gold)',
                  color: 'var(--rai-black)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                JD
              </div>
            </div>
            <span className="badge badge-muted" style={{ marginBottom: 8, display: 'inline-block' }}>Obsoleto</span>
            <div style={{ fontSize: 11, lineHeight: 1.7 }}>
              <div><span className="muted">Nombre del negocio:</span> Tech Innovators Inc.</div>
              <div><span className="muted">Fuente:</span> Referencia</div>
              <div><span className="muted">Valor:</span> €50,000.00</div>
              <div><span className="muted">Razón de abandono:</span> Restricciones presupuest…</div>
            </div>
            <div className="row" style={{ gap: 6, marginTop: 8, color: 'var(--rai-muted)' }}>
              <Phone size={12} /><Mail size={12} /><CalendarCheck size={12} /><Activity size={12} />
              <span className="badge badge-muted" style={{ marginLeft: 'auto' }}>Sep 5th, 3:00 pm</span>
            </div>
          </div>

          {/* Diseño */}
          <div className="muted mb-2" style={{ fontSize: 12 }}>Diseño de tarjeta</div>
          <div className="row" style={{ gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { id: 'default', label: 'Por defecto' },
              { id: 'compact', label: 'Compacto' },
              { id: 'unlabeled', label: 'Sin etiquetar' },
            ].map((d) => (
              <label key={d.id} className="row" style={{ gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="design"
                  checked={design === d.id}
                  onChange={() => setDesign(d.id as any)}
                />
                {d.label}
              </label>
            ))}
          </div>

          {/* Tabs */}
          <div className="row" style={{ borderBottom: '1px solid var(--rai-border)', marginBottom: 12 }}>
            {[
              { id: 'campos', label: `Campos (${fields.filter((f) => f.on).length} de ${fields.length + 1})` },
              { id: 'actividades', label: 'Actividades rápidas' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className="ghost"
                style={{
                  padding: '10px 12px',
                  borderBottom: tab === t.id ? '2px solid var(--rai-gold)' : '2px solid transparent',
                  color: tab === t.id ? 'var(--rai-gold)' : 'var(--rai-muted)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--rai-muted)' }} />
            <input className="input" placeholder="Campos de búsqueda" style={{ paddingLeft: 30 }} />
          </div>

          {/* Field list */}
          {tab === 'campos' ? (
            <div>
              {fields.map((f) => (
                <div
                  key={f.id}
                  className="row"
                  style={{
                    gap: 8,
                    padding: '8px 4px',
                    borderBottom: '1px solid var(--rai-border)',
                    fontSize: 13,
                  }}
                >
                  <GripVertical size={14} color="var(--rai-muted)" />
                  <input type="checkbox" defaultChecked={f.on} disabled={f.locked} />
                  <span style={{ flex: 1 }}>{f.label}</span>
                  {f.badge && <span className="badge badge-gold">{f.badge}</span>}
                  {f.locked && <span className="badge badge-muted">🔒</span>}
                </div>
              ))}
              <div className="muted mt-4 mb-2" style={{ fontSize: 12 }}>Añadir campos</div>
              {['Otra información', 'Director · Contacto detalles', 'Oportunidad · Detalles'].map((s) => (
                <button
                  key={s}
                  onClick={() => toast('Próximamente')}
                  className="ghost"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 4px',
                    fontSize: 13,
                    borderBottom: '1px solid var(--rai-border)',
                  }}
                >
                  <ChevronDown size={14} /> {s}
                </button>
              ))}
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: 32 }}>
              Sin actividades rápidas configuradas. Próximamente.
            </div>
          )}
        </div>

        <div className="row-between" style={{ padding: 16, borderTop: '1px solid var(--rai-border)' }}>
          <button className="secondary" onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={() => { toast.success('Configuración guardada'); onClose(); }}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main view: Kanban board
// ─────────────────────────────────────────────────────────────────────────────
function PipelineBoard({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
      {STAGES.map((s) => (
        <div
          key={s.id}
          style={{
            minWidth: 260,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: s.bg,
              borderLeft: `3px solid ${s.color}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
              0 Clientes potenciales · €0.00
            </div>
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 200,
              borderRadius: 8,
              border: '1px dashed var(--rai-border)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: 'var(--rai-muted)',
              fontSize: 11,
            }}
          >
            Sin oportunidades
            <button className="ghost btn-sm" onClick={onAdd}>
              <Plus size={12} /> Añadir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main view: List view
// ─────────────────────────────────────────────────────────────────────────────
function PipelineList() {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 36 }}><input type="checkbox" /></th>
            <th>Nombre</th>
            <th>Etapa</th>
            <th>Contacto</th>
            <th>Valor</th>
            <th>Propietario</th>
            <th>Fecha de cierre</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--rai-muted)' }}>
              <FileText size={20} color="var(--rai-gold)" style={{ marginBottom: 6 }} />
              <div style={{ fontWeight: 600, color: 'var(--rai-text)' }}>Aún no tienes oportunidades</div>
              <div style={{ fontSize: 12 }}>Crea una oportunidad o cambia a vista de tablero para ver el embudo.</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Oportunidades (default)
// ─────────────────────────────────────────────────────────────────────────────
function Oportunidades({
  view,
  setView,
  onAdd,
  onCustomize,
}: {
  view: 'board' | 'list';
  setView: (v: 'board' | 'list') => void;
  onAdd: () => void;
  onCustomize: () => void;
}) {
  const [subTab, setSubTab] = useState<'oportunidades' | 'nueva'>('oportunidades');
  const [viewMenu, setViewMenu] = useState(false);

  return (
    <div>
      {/* Pipeline selector + actions */}
      <div className="row-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <button className="secondary" onClick={() => toast('Próximamente')}>
            Embudo de Ventas Principal <ChevronDown size={14} />
          </button>
          <span className="badge badge-gold">0 clientes potenciales</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 0, border: '1px solid var(--rai-border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setView('board')}
              className="ghost btn-icon"
              style={{
                background: view === 'board' ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: view === 'board' ? 'var(--rai-gold)' : 'var(--rai-muted)',
                borderRadius: 0,
              }}
              aria-label="Vista de tablero"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className="ghost btn-icon"
              style={{
                background: view === 'list' ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: view === 'list' ? 'var(--rai-gold)' : 'var(--rai-muted)',
                borderRadius: 0,
              }}
              aria-label="Vista de lista"
            >
              <List size={16} />
            </button>
          </div>
          <button className="secondary" onClick={() => toast('Próximamente')}>
            <Upload size={14} /> Importar
          </button>
          <button className="primary" onClick={onAdd}>
            <Plus size={14} /> Añadir oportunidad
          </button>
          <button className="ghost btn-icon" onClick={() => toast('Próximamente')} aria-label="Más">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="row" style={{ gap: 4, borderBottom: '1px solid var(--rai-border)', marginBottom: 14, position: 'relative' }}>
        <button
          onClick={() => setSubTab('oportunidades')}
          className="ghost"
          style={{
            padding: '10px 14px',
            borderBottom: subTab === 'oportunidades' ? '2px solid var(--rai-gold)' : '2px solid transparent',
            color: subTab === 'oportunidades' ? 'var(--rai-gold)' : 'var(--rai-muted)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <List size={14} /> Oportunidades activas
        </button>
        <button
          onClick={() => setViewMenu(!viewMenu)}
          className="ghost"
          style={{ padding: '10px 14px', color: 'var(--rai-muted)', fontSize: 13 }}
        >
          <Plus size={14} /> Lista
        </button>
        {viewMenu && (
          <div
            className="card"
            style={{
              position: 'absolute',
              top: 44,
              left: 160,
              zIndex: 30,
              padding: 6,
              minWidth: 240,
              boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            }}
          >
            <button
              className="ghost"
              onClick={() => { setView('board'); setViewMenu(false); }}
              style={{ width: '100%', justifyContent: 'flex-start', padding: 10, textAlign: 'left' }}
            >
              <LayoutGrid size={14} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Vista de tablero</div>
                <div className="muted" style={{ fontSize: 11 }}>Vea las oportunidades como tarjetas en cada fase.</div>
              </div>
            </button>
            <button
              className="ghost"
              onClick={() => { setView('list'); setViewMenu(false); }}
              style={{ width: '100%', justifyContent: 'flex-start', padding: 10, textAlign: 'left' }}
            >
              <List size={14} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Vista de lista</div>
                <div className="muted" style={{ fontSize: 11 }}>Vea las oportunidades en formato de tabla.</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="row-between mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary btn-sm">
            <SlidersHorizontal size={14} /> Filtros avanzados
          </button>
          <button className="secondary btn-sm">
            <ArrowUpDown size={14} /> Ordenar <span className="badge badge-gold" style={{ marginLeft: 4 }}>1</span>
          </button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--rai-muted)' }} />
            <input className="input" placeholder="Buscar clientes potenciales" style={{ paddingLeft: 30, width: 240, height: 32 }} />
          </div>
          <button className="secondary btn-sm" onClick={onCustomize}>
            <Settings size={14} /> Gestionar campos
          </button>
        </div>
      </div>

      {/* Body: board or list */}
      {view === 'board' ? <PipelineBoard onAdd={onAdd} /> : <PipelineList />}

      {/* Big empty state under board */}
      {view === 'board' && (
        <div className="card" style={{ marginTop: 24, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CatEmpty />
          </div>
          <h3 style={{ marginTop: 12 }}>¡Crea tu primera oportunidad!</h3>
          <p className="muted" style={{ maxWidth: 480, margin: '8px auto', fontSize: 13 }}>
            Haz un seguimiento y gestiona los clientes potenciales, visualiza tu secuencia de ventas y haz un seguimiento del progreso para hacer crecer tus ventas de manera eficiente.
          </p>
          <div className="row" style={{ gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <button className="primary" onClick={onAdd}>
              <Plus size={14} /> Añadir oportunidad
            </button>
            <button className="secondary" onClick={() => toast('Próximamente')}>
              <Upload size={14} /> Importar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Pronóstico
// ─────────────────────────────────────────────────────────────────────────────
function Pronostico() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="h2" style={{ margin: 0 }}>Pronóstico de ventas</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          Estimaciones de cierre por etapa, mes y propietario.
        </p>
      </div>
      <div className="grid-3 mb-4">
        {['Este mes', 'Próximo mes', 'Trimestre'].map((p) => (
          <div key={p} className="card">
            <div className="muted" style={{ fontSize: 12 }}>{p}</div>
            <div className="h2" style={{ marginTop: 6, color: 'var(--rai-gold)' }}>€0</div>
            <div className="muted" style={{ fontSize: 11 }}>0 oportunidades · 0% probabilidad media</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <TrendingUp size={32} color="var(--rai-gold)" style={{ marginBottom: 8 }} />
        <h3>Aún no hay datos de pronóstico</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Crea oportunidades y asigna probabilidades por etapa para ver tu forecast.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Secuencia
// ─────────────────────────────────────────────────────────────────────────────
function Secuencia() {
  return (
    <div>
      <div className="row-between mb-4">
        <div>
          <h2 className="h2" style={{ margin: 0 }}>Secuencias del embudo</h2>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Configura las etapas, probabilidades y reglas de tu pipeline.
          </p>
        </div>
        <button className="primary" onClick={() => toast('Próximamente')}>
          <Plus size={14} /> Nueva secuencia
        </button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Etapa</th>
              <th>Color</th>
              <th>Probabilidad</th>
              <th>Oportunidades</th>
              <th>Valor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {STAGES.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.label}</td>
                <td>
                  <span style={{
                    display: 'inline-block', width: 14, height: 14, borderRadius: 4, background: s.color, verticalAlign: 'middle',
                  }} />
                </td>
                <td className="muted">—</td>
                <td>0</td>
                <td>€0.00</td>
                <td>
                  <button className="ghost btn-icon" aria-label="Editar" onClick={() => toast('Próximamente')}>
                    <Settings size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <h2 className="h2" style={{ margin: 0 }}>Acciones en lote</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          Seguimiento de operaciones masivas sobre tus oportunidades.
        </p>
      </div>
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <ListChecks size={28} color="var(--rai-gold)" style={{ marginBottom: 8 }} />
        <h3>No se han ejecutado acciones en lote</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Cuando hagas cambios masivos (asignar propietario, mover de etapa, etiquetar), aquí verás el historial.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ClientesPotencialesPage() {
  const [tab, setTab] = useState<TopTab>('oportunidades');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [showAdd, setShowAdd] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  return (
    <div className="container">
      {/* Heading */}
      <div className="row mb-4" style={{ gap: 10, alignItems: 'center' }}>
        <Target size={20} color="var(--rai-gold)" />
        <h1 className="h1" style={{ margin: 0 }}>Clientes Potenciales</h1>
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
      </div>

      {/* Content */}
      {tab === 'oportunidades' && (
        <Oportunidades
          view={view}
          setView={setView}
          onAdd={() => setShowAdd(true)}
          onCustomize={() => setShowCustomize(true)}
        />
      )}
      {tab === 'pronostico' && <Pronostico />}
      {tab === 'secuencia' && <Secuencia />}
      {tab === 'lote' && <AccionesEnLote />}

      {/* Modals */}
      {showAdd && <AddOpportunityModal onClose={() => setShowAdd(false)} />}
      {showCustomize && <CustomizeCardDrawer onClose={() => setShowCustomize(false)} />}
    </div>
  );
}
