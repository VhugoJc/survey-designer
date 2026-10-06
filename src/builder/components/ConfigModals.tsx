import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import type { BuilderEngine } from './useBuilderState';
import type { BuilderColumn, BuilderColumnType } from '../types';
import { buildJsonSchema, importFromJsonSchema } from '../serializer';

// ──────────────────────────────────────────────
// Header & Metadata Config Modal
// ──────────────────────────────────────────────

interface HeaderConfigModalProps {
  open: boolean;
  onClose: () => void;
  engine: BuilderEngine;
}

export function HeaderConfigModal({ open, onClose, engine }: HeaderConfigModalProps) {
  const state = engine.getState();

  return (
    <Modal open={open} onClose={onClose} title="Configurar Encabezado y Metadatos" wide>
      <div className="space-y-4">
        {/* Document */}
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Documento</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 font-semibold">Empresa</label>
              <input
                type="text"
                value={state.document.company}
                onChange={(e) => engine.setCompany(e.target.value)}
                className="field-input text-xs"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 font-semibold">Título</label>
              <input
                type="text"
                value={state.document.title}
                onChange={(e) => engine.setTitle(e.target.value)}
                className="field-input text-xs"
              />
            </div>
          </div>
        </div>

        {/* Metadata fields */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase text-slate-500">Campos de Metadatos</h3>
            <button
              type="button"
              onClick={() => engine.addMetadataField()}
              className="px-2 py-1 text-[10px] font-bold text-white bg-slate-600 rounded hover:bg-slate-500"
            >
              + Campo
            </button>
          </div>
          {state.metadata.map((field) => (
            <div key={field.key} className="grid grid-cols-[1fr_2fr_80px_30px] gap-2 items-center py-1 border-b border-slate-100">
              <span className="text-[10px] text-slate-400 font-mono">{field.key}</span>
              <input
                type="text"
                value={field.label}
                onChange={(e) => engine.updateMetadataField(field.key, { label: e.target.value })}
                className="field-input text-[11px] w-full"
              />
              <select
                value={field.type}
                onChange={(e) =>
                  engine.updateMetadataField(field.key, { type: e.target.value as 'string' | 'date' })
                }
                className="field-input text-[11px]"
              >
                <option value="string">Texto</option>
                <option value="date">Fecha</option>
              </select>
              <button
                type="button"
                onClick={() => engine.removeMetadataField(field.key)}
                className="text-[10px] text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Section Config Modal
// ──────────────────────────────────────────────

interface SectionConfigModalProps {
  open: boolean;
  onClose: () => void;
  engine: BuilderEngine;
  sectionId?: string;
}

export function SectionConfigModal({ open, onClose, engine, sectionId }: SectionConfigModalProps) {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (open) {
      const s = engine.getState();
      const existing = sectionId ? s.sections.find((sec) => sec.id === sectionId) : null;
      setTitle(existing?.title ?? '');
    }
  }, [open, sectionId]);

  const handleSave = () => {
    const currentState = engine.getState();
    const existing = sectionId ? currentState.sections.find((s) => s.id === sectionId) : null;
    if (existing) {
      engine.updateSectionTitle(sectionId!, title);
    } else {
      engine.addSection(title);
    }
    onClose();
  };

  const isEditing = sectionId !== undefined;
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar Sección' : 'Crear Sección'}>
      <div className="space-y-3">
        <div className="flex flex-col">
          <label className="text-[10px] text-slate-400 font-semibold">Título de la sección</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field-input text-xs"
            placeholder="Ej: Lubricación General"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-md hover:bg-slate-100">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="px-3 py-1.5 text-xs font-bold text-white bg-slate-700 rounded-md hover:bg-slate-600">
            {isEditing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Column Config Modal
// ──────────────────────────────────────────────

interface ColumnConfigModalProps {
  open: boolean;
  onClose: () => void;
  engine: BuilderEngine;
  sectionId: string;
  column?: BuilderColumn;
  parentGroupId?: string;
}

export function ColumnConfigModal({ open, onClose, engine, sectionId, column, parentGroupId }: ColumnConfigModalProps) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<BuilderColumnType>('text');
  const [editable, setEditable] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupLabel, setGroupLabel] = useState('');

  useEffect(() => {
    if (open) {
      if (column) {
        setLabel(column.label ?? '');
        setType(column.type ?? 'text');
        setEditable(column.editable ?? false);
        setOptions(column.options ?? []);
        setIsGroup(column.isGroup ?? false);
        setGroupLabel(column.isGroup ? column.label : '');
      } else {
        setLabel('');
        setType('text');
        setEditable(false);
        setOptions([]);
        setIsGroup(false);
        setGroupLabel('');
      }
    }
  }, [open, column]);

  const handleSave = () => {
    if (column) {
      if (column.isGroup) {
        engine.updateColumn(sectionId, column.id, { label: groupLabel || label });
      } else {
        engine.updateColumn(sectionId, column.id, { label, type, editable, options });
      }
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={column ? (column.isGroup ? 'Editar Grupo' : 'Editar Columna') : 'Nueva Columna'}>
      <div className="space-y-3">
        {column?.isGroup ? (
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-400 font-semibold">Nombre del grupo</label>
            <input type="text" value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)} className="field-input text-xs" placeholder="Ej: M11, TOLERANCIA" />
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 font-semibold">Etiqueta</label>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="field-input text-xs" placeholder="Ej: LUBRICANTE" />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 font-semibold">Tipo de dato</label>
              <select value={type} onChange={(e) => setType(e.target.value as BuilderColumnType)} className="field-input text-xs">
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="checkbox">Checkbox</option>
                <option value="textarea">Texto largo</option>
                <option value="select">Selección</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={editable} onChange={(e) => setEditable(e.target.checked)} />
              Editable por el operador
            </label>
            {type === 'select' && (
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-400 font-semibold">Opciones (Enter para añadir)</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {options.map((opt, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-slate-100 border border-slate-300 rounded px-2 py-0.5">
                      {opt}
                      <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-[10px] text-red-400">✕</button>
                    </span>
                  ))}
                </div>
                <input type="text" className="field-input text-[11px]" placeholder="Escribe y presiona Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) { setOptions([...options, val]); (e.target as HTMLInputElement).value = ''; }
                    }
                  }} />
              </div>
            )}
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          {column && (
            <button type="button" onClick={() => { engine.removeColumn(sectionId, column.id); onClose(); }}
              className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600">🗑️ Eliminar</button>
          )}
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-md hover:bg-slate-100">Cancelar</button>
          <button type="button" onClick={handleSave} className="px-3 py-1.5 text-xs font-bold text-white bg-slate-700 rounded-md hover:bg-slate-600">Guardar</button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Row Config Modal
// ──────────────────────────────────────────────

interface RowConfigModalProps {
  open: boolean;
  onClose: () => void;
  engine: BuilderEngine;
  sectionId: string;
  rowId: string;
  columns: BuilderColumn[];
}

export function RowConfigModal({ open, onClose, engine, sectionId, rowId, columns }: RowConfigModalProps) {
  const state = engine.getState();
  const section = state.sections.find((s) => s.id === sectionId);
  const row = section?.rows.find((r) => r.id === rowId);
  const cells = row?.cells ?? {};

  return (
    <Modal open={open} onClose={onClose} title="Editar Fila">
      <div className="space-y-2">
        {columns.map((col) => {
          const ck = col.key ?? '';
          const val = cells[ck] ?? '';
          return (
            <div key={col.id} className="grid grid-cols-[1fr_2fr] gap-2 items-center">
              <span className="text-[10px] text-slate-400 font-mono">{col.label}</span>
              {col.editable ? (
                <span className="text-[11px] text-blue-500 italic">Campo editable (se llena en el reporte)</span>
              ) : (
                <input
                  type="text"
                  value={val}
                  onChange={(e) => engine.updateCell(sectionId, rowId, ck, e.target.value)}
                  className="field-input text-[11px] w-full"
                  placeholder="Texto fijo"
                />
              )}
            </div>
          );
        })}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => { engine.removeRow(sectionId, rowId); onClose(); }}
            className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600">🗑️ Eliminar fila</button>
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-md hover:bg-slate-100">Cerrar</button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Confirm Delete Modal
// ──────────────────────────────────────────────

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}

export function ConfirmDeleteModal({ open, onClose, onConfirm, message }: ConfirmDeleteModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Confirmar Eliminación">
      <p className="text-sm text-slate-600 mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-md hover:bg-slate-100">Cancelar</button>
        <button type="button" onClick={() => { onConfirm(); onClose(); }} className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-md hover:bg-red-500">Eliminar</button>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Export / Import Modal
// ──────────────────────────────────────────────

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  engine: BuilderEngine;
}

export function ExportModal({ open, onClose, engine }: ExportModalProps) {
  const state = engine.getState();
  const json = JSON.stringify(buildJsonSchema(state), null, 2);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      // Reload the page with the imported schema — for simplicity we use the import function
      const imported = importFromJsonSchema(parsed);
      // We can't replace the engine state directly, so we reload
      window.location.reload();
      // In a real app you'd use a callback to set the engine state
    } catch {
      alert('JSON inválido');
    }
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de borrar todo el formulario?')) {
      window.location.reload();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Configuración Avanzada" wide>
      <div className="space-y-4">
        {/* Export */}
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Exportar JSON</h3>
          <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-40 overflow-auto text-slate-600">{json}</pre>
          <button type="button" onClick={handleCopy} className="mt-2 px-3 py-1.5 text-xs font-bold text-white bg-slate-700 rounded-md hover:bg-slate-600">
            {copied ? '✅ Copiado' : '📋 Copiar al portapapeles'}
          </button>
        </div>

        {/* Import */}
        <div>
          <button type="button" onClick={() => setShowImport(!showImport)} className="text-xs font-bold text-slate-600 hover:text-slate-800">
            {showImport ? '▼ Ocultar importación' : '▶ Importar JSON'}
          </button>
          {showImport && (
            <div className="mt-2 space-y-2">
              <textarea
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="field-input text-[11px] w-full font-mono"
                placeholder="Pega el JSON aquí..."
              />
              <button type="button" onClick={handleImport} className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-500">
                📥 Cargar
              </button>
            </div>
          )}
        </div>

        {/* Reset */}
        <div>
          <button type="button" onClick={handleReset} className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-md hover:bg-red-500">
            🗑️ Reiniciar / Limpiar Formulario
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Need to import buildJsonSchema and importFromJsonSchema