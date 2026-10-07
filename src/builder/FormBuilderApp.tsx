import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuilderState } from './components/useBuilderState';
import { LivePreview } from './components/LivePreview';
import { buildJsonSchema, importFromJsonSchema } from './serializer';
import { registerTemplate, updateTemplate } from '../schema/registry';
import { Modal } from './components/Modal';
import type { FormBuilderState, BuilderColumn } from './types';
import {
  HeaderConfigModal,
  SectionConfigModal,
  ColumnConfigModal,
  RowConfigModal,
  ConfirmDeleteModal,
  ExportModal,
} from './components/ConfigModals';

// ──────────────────────────────────────────────
// FormBuilderApp — single canvas + modals
// ──────────────────────────────────────────────

interface FormBuilderAppProps {
  initialJson?: Record<string, unknown>;
  templateId?: string;
}

export function FormBuilderApp({ initialJson, templateId }: FormBuilderAppProps) {
  const initial: FormBuilderState | undefined =
    initialJson ? importFromJsonSchema(initialJson) : undefined;
  const engine = useBuilderState(initial);
  const navigate = useNavigate();

  // Helper: always read fresh state
  const getState = () => engine.getState();

  // Modal state
  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | undefined>();
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columnModalSectionId, setColumnModalSectionId] = useState('');
  const [columnModalColumn, setColumnModalColumn] = useState<BuilderColumn | undefined>();
  const [columnModalGroupId, setColumnModalGroupId] = useState<string | undefined>();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalSectionId, setGroupModalSectionId] = useState('');
  const [groupModalGroupId, setGroupModalGroupId] = useState<string | undefined>();
  const [groupModalLabel, setGroupModalLabel] = useState<string | undefined>();
  const [showRowModal, setShowRowModal] = useState(false);
  const [rowModalSectionId, setRowModalSectionId] = useState('');
  const [rowModalRowId, setRowModalRowId] = useState('');
  const [rowModalColumns, setRowModalColumns] = useState<BuilderColumn[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteAction, setDeleteAction] = useState<() => void>(() => {});
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Save modal logic
  const handleSaveNew = () => {
    const json = buildJsonSchema(getState());
    const title = getState().document.title || 'Plantilla Personalizada';
    registerTemplate(json, title);
    setShowSaveModal(false);
    navigate('/reports');
  };

  const handleUpdateExisting = () => {
    if (!templateId) return;
    const json = buildJsonSchema(getState());
    const title = getState().document.title || 'Plantilla Personalizada';
    updateTemplate(templateId, json, title);
    setShowSaveModal(false);
    navigate('/reports');
  };

  const openSaveModal = () => setShowSaveModal(true);

  // Helpers
  const confirmDelete = (message: string, action: () => void) => {
    setDeleteMessage(message);
    setDeleteAction(() => action);
    setShowDeleteModal(true);
  };

  const openColumnModal = (sectionId: string, col?: BuilderColumn, groupId?: string) => {
    setColumnModalSectionId(sectionId);
    setColumnModalColumn(col);
    setColumnModalGroupId(groupId);
    setShowColumnModal(true);
  };

  const openGroupModal = (sectionId: string, groupId?: string, label?: string) => {
    setGroupModalSectionId(sectionId);
    setGroupModalGroupId(groupId);
    setGroupModalLabel(label);
    setShowGroupModal(true);
  };

  const openRowModal = (sectionId: string, rowId: string, columns: BuilderColumn[]) => {
    setRowModalSectionId(sectionId);
    setRowModalRowId(rowId);
    setRowModalColumns(columns);
    setShowRowModal(true);
  };

  const openSectionModal = (sectionId?: string) => {
    setEditingSectionId(sectionId);
    setShowSectionModal(true);
  };

  // Get all leaf columns from a section (recurses into groups)
  const getLeafColumns = (sec: { columns: BuilderColumn[] }): BuilderColumn[] => {
    const cols: BuilderColumn[] = [];
    for (const col of sec.columns) {
      if (col.isGroup && col.children) {
        for (const child of col.children) cols.push(child);
      } else {
        cols.push(col);
      }
    }
    return cols;
  };

  // Check if a section has any grouped columns
  const hasGroups = (sec: { columns: BuilderColumn[] }): boolean =>
    sec.columns.filter((c) => c.isGroup).length > 0;

  return (
    <div className="fluid-canvas">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Diseñador</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => engine.undo()} disabled={!engine.canUndo}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40">↩ Deshacer</button>
            <button type="button" onClick={() => engine.redo()} disabled={!engine.canRedo}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40">↪ Rehacer</button>
          </div>
          <span className="text-xs text-slate-400">{getState().sections.length} secciones · {getState().metadata.length} metadatos</span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={openSaveModal}
              className="px-3 py-1.5 text-xs font-bold text-white bg-green-700 rounded-md hover:bg-green-600">💾 Guardar</button>
            <button type="button" onClick={() => setShowExportModal(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-slate-700 rounded-md hover:bg-slate-600">⚙️ Avanzado</button>
          </div>
        </div>
      </div>

      {/* ── LIVE CANVAS ── */}
      <div className="space-y-4">
        {/* Header section — clickable */}
        <div
          className="report-card cursor-pointer hover:ring-2 hover:ring-blue-300 transition-shadow relative group"
          onClick={() => setShowHeaderModal(true)}
        >
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded">✏️ Editar encabezado</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 font-semibold uppercase">Empresa</label>
              <span className="text-sm font-medium text-slate-800">{getState().document.company}</span>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 font-semibold uppercase">Título</label>
              <span className="text-sm font-medium text-slate-800">{getState().document.title}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            {getState().metadata.map((f) => (
              <div key={f.key} className="flex flex-col">
                <label className="text-[10px] text-slate-400 font-semibold uppercase">{f.label}</label>
                <span className="text-xs text-slate-500 italic">{f.type === 'date' ? '[Fecha]' : '[Texto]'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        {getState().sections.map((sec) => {
          const leafCols = getLeafColumns(sec);
          const grouped = hasGroups(sec);
          return (
            <div key={sec.id} className="report-card relative group">
              {/* Section controls */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button type="button" onClick={() => openSectionModal(sec.id)}
                  className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600">✏️</button>
                <button type="button" onClick={() => engine.addColumn(sec.id)}
                  className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700">+ Col</button>
                <button type="button" onClick={() => engine.addColumnGroup(sec.id)}
                  className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700">+ Grupo</button>
                <button type="button" onClick={() => engine.addRow(sec.id)}
                  className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700">+ Row</button>
                <button type="button" onClick={() => confirmDelete(`¿Eliminar la sección "${sec.title}"?`, () => engine.removeSection(sec.id))}
                  className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600">✕</button>
              </div>

              {/* Section title */}
              <h2 className="section-title">{sec.title || 'Sección sin título'}</h2>

              {/* Rows */}
              <div className="overflow-x-auto">
                <table className="paper-table">
                  <thead>
                    {grouped ? (
                      <>
                        <tr className="bg-slate-700">
                          {sec.columns.map((col) => {
                            const isGroup = col.isGroup && col.children;
                            return (
                              <th key={col.id}
                                colSpan={isGroup ? Math.max(1, col.children!.length) : 1}
                                rowSpan={isGroup ? 1 : 2}
                                className="text-[10px] text-white text-center cursor-pointer hover:bg-slate-600"
                                onClick={() => openColumnModal(sec.id, col)}>
                                <div className="flex items-center justify-center gap-1">
                                  <span>{col.label}</span>
                                  {isGroup && col.children!.length === 0 && <span className="text-[8px] text-blue-300 italic">(vacío)</span>}
                                  {isGroup && (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); engine.addGroupChild(sec.id, col.id); }}
                                      className="text-[9px] text-blue-300 hover:text-blue-200">+</button>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                        <tr>
                          {sec.columns.reduce((acc, col) => {
                            if (col.isGroup && col.children) {
                              return acc.concat(col.children);
                            }
                            return acc; // skip single columns — they already rendered with rowSpan=2
                          }, [] as BuilderColumn[]).map((col) => (
                            <th key={col.id} className="text-[10px] relative group/th">
                              <span>{col.label}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); openColumnModal(sec.id, col); }}
                                className="ml-1 text-[9px] text-blue-500 hover:text-blue-700 opacity-0 group-hover/th:opacity-100 transition-opacity">✏️</button>
                            </th>
                          ))}
                        </tr>
                      </>
                    ) : (
                      <tr>
                        {sec.columns.map((col) => (
                          <th key={col.id} className="text-[10px] relative group/th">
                            <span>{col.label}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); openColumnModal(sec.id, col); }}
                              className="ml-1 text-[9px] text-blue-500 hover:text-blue-700 opacity-0 group-hover/th:opacity-100 transition-opacity" title="Editar columna">✏️</button>
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {sec.rows.length === 0 && (
                      <tr>
                        <td colSpan={99} className="text-center py-4 text-xs text-slate-400 italic">
                          Sin filas. Haz clic en "+ Row" arriba para añadir.
                        </td>
                      </tr>
                    )}
                    {sec.rows.map((row) => (
                      <tr key={row.id} className="cursor-pointer hover:bg-blue-50" onClick={() => openRowModal(sec.id, row.id, leafCols)}>
                        {leafCols.map((col) => {
                          const ck = col.key ?? '';
                          const val = row.cells[ck] ?? '';
                          return (
                            <td key={col.id} className="text-xs cursor-pointer">
                              {col.editable ? (
                                <span className="text-blue-400 italic">—</span>
                              ) : (
                                <span className="text-slate-600">{val || '—'}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              {sec.footer && (
                <div className="mt-2 text-[11px] text-slate-500 italic border-t border-slate-200 pt-2">
                  {sec.footer.nota && <p>📝 {sec.footer.nota}</p>}
                  {sec.footer.input && <p>✏️ {sec.footer.input.label}</p>}
                </div>
              )}
            </div>
          );
        })}

        {/* Add section button */}
        <button type="button" onClick={() => openSectionModal()}
          className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors">
          + Añadir Nueva Sección
        </button>

        {/* Global observations */}
        {getState().globalField && (
          <div className="report-card cursor-pointer hover:ring-2 hover:ring-blue-300 transition-shadow relative group"
            onClick={() => {
              const newLabel = prompt('Nueva etiqueta para observaciones:', getState().globalField?.label ?? '');
              if (newLabel) engine.updateGlobalField({ label: newLabel });
            }}>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded">✏️ Editar</span>
            </div>
            <label className="text-xs font-bold uppercase text-slate-500">{getState().globalField?.label ?? 'Observaciones'}</label>
            <div className="mt-1 text-xs text-slate-400 italic">[Área de texto]</div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <HeaderConfigModal open={showHeaderModal} onClose={() => setShowHeaderModal(false)} engine={engine} />
      <SectionConfigModal open={showSectionModal} onClose={() => setShowSectionModal(false)} engine={engine} sectionId={editingSectionId} />
      <ColumnConfigModal open={showColumnModal} onClose={() => setShowColumnModal(false)} engine={engine} sectionId={columnModalSectionId} column={columnModalColumn} parentGroupId={columnModalGroupId} />
      <RowConfigModal open={showRowModal} onClose={() => setShowRowModal(false)} engine={engine} sectionId={rowModalSectionId} rowId={rowModalRowId} columns={rowModalColumns} />
      <ConfirmDeleteModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={deleteAction} message={deleteMessage} />
      <ExportModal open={showExportModal} onClose={() => setShowExportModal(false)} engine={engine} />

      {/* ── Save Modal ── */}
      <Modal open={showSaveModal} onClose={() => setShowSaveModal(false)} title="Guardar Plantilla">
        <div className="space-y-3 px-5 py-4">
          {templateId ? (
            <p className="text-sm text-slate-600">
              Esta plantilla ya existe. ¿Deseas actualizarla o guardar una copia como nueva?
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              ¿Guardar esta plantilla como nuevo reporte en la galería?
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowSaveModal(false)}
              className="px-3 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-md hover:bg-slate-100">
              Cancelar
            </button>
            {templateId && (
              <button type="button" onClick={handleUpdateExisting}
                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-500">
                💾 Actualizar existente
              </button>
            )}
            <button type="button" onClick={handleSaveNew}
              className="px-3 py-1.5 text-xs font-bold text-white bg-green-700 rounded-md hover:bg-green-600">
              {templateId ? '📄 Guardar como nueva' : '💾 Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}