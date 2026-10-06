import type { BuilderEngine } from './useBuilderState';
import type { BuilderSection, BuilderColumn, BuilderColumnGroup, BuilderRow } from '../index';

interface SectionListEditorProps {
  engine: BuilderEngine;
}

export function SectionListEditor({ engine }: SectionListEditorProps) {
  const state = engine.getState();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Secciones ({state.sections.length})
        </h3>
        <button
          type="button"
          onClick={() => engine.addSection()}
          className="px-3 py-1.5 text-xs font-bold text-white bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
        >
          + Añadir Sección
        </button>
      </div>

      {state.sections.length === 0 && (
        <p className="text-sm text-slate-400 italic py-4 text-center">
          No hay secciones. Haz clic en "Añadir Sección" para comenzar.
        </p>
      )}

      {state.sections.map((sec, i) => (
        <SectionCard
          key={sec.id}
          section={sec}
          index={i}
          total={state.sections.length}
          engine={engine}
        />
      ))}
    </div>
  );
}

// ── Section Card ──

interface SectionCardProps {
  section: BuilderSection;
  index: number;
  total: number;
  engine: BuilderEngine;
}

function SectionCard({ section, index, total, engine }: SectionCardProps) {
  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 w-6 text-center">{index + 1}</span>
        <input
          type="text"
          value={section.title}
          onChange={(e) => engine.updateSectionTitle(section.id, e.target.value)}
          className="flex-1 field-input text-sm font-semibold"
          placeholder="Título de la sección"
        />
        <div className="flex gap-1">
          {index > 0 && (
            <button
              type="button"
              onClick={() => engine.moveSection(section.id, -1)}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
              title="Mover arriba"
            >
              ↑
            </button>
          )}
          {index < total - 1 && (
            <button
              type="button"
              onClick={() => engine.moveSection(section.id, 1)}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
              title="Mover abajo"
            >
              ↓
            </button>
          )}
          <button
            type="button"
            onClick={() => engine.removeSection(section.id)}
            className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
            title="Eliminar sección"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Layout toggle */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase">Layout:</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="radio"
            name={`layout_${section.id}`}
            checked={section.layout !== 'grouped'}
            onChange={() => engine.setSectionLayout(section.id, 'flat')}
          />
          Plano
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="radio"
            name={`layout_${section.id}`}
            checked={section.layout === 'grouped'}
            onChange={() => engine.setSectionLayout(section.id, 'grouped')}
          />
          Agrupado
        </label>
      </div>

      {/* Column manager */}
      <div className="px-4 py-3">
        {section.layout === 'grouped' ? (
          <GroupedColumnManager section={section} engine={engine} />
        ) : (
          <FlatColumnManager section={section} engine={engine} />
        )}
      </div>

      {/* Row manager */}
      <div className="px-4 py-3 border-t border-slate-100">
        <RowManager section={section} engine={engine} />
      </div>

      {/* Footer manager */}
      <div className="px-4 py-3 border-t border-slate-100">
        <FooterManager section={section} engine={engine} />
      </div>
    </div>
  );
}

// ── Flat Column Manager ──

function FlatColumnManager({ section, engine }: { section: BuilderSection; engine: BuilderEngine }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase">
          Columnas ({section.columns.length})
        </span>
        <button
          type="button"
          onClick={() => engine.addColumn(section.id)}
          className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800"
        >
          + Columna
        </button>
      </div>

      {section.columns.length === 0 && (
        <p className="text-xs text-slate-400 italic">Sin columnas. Añade una columna.</p>
      )}

      <div className="grid grid-cols-[1fr_2fr_80px_60px_40px] gap-2 text-xs text-slate-400 font-semibold uppercase border-b border-slate-200 pb-1 mb-1">
        <span>Clave</span>
        <span>Etiqueta</span>
        <span>Tipo</span>
        <span>Editar</span>
        <span></span>
      </div>

      {section.columns.map((col) => (
        <ColumnRow key={col.key} sectionId={section.id} col={col} engine={engine} />
      ))}
    </div>
  );
}

function ColumnRow({
  sectionId,
  col,
  engine,
}: {
  sectionId: string;
  col: BuilderColumn;
  engine: BuilderEngine;
}) {
  return (
    <div className="grid grid-cols-[1fr_2fr_80px_60px_40px] gap-2 items-center py-1 border-b border-slate-100">
      <span className="text-xs text-slate-400 font-mono">{col.key}</span>
      <input
        type="text"
        value={col.label}
        onChange={(e) => engine.updateColumn(sectionId, col.key, { label: e.target.value })}
        className="field-input text-xs w-full"
      />
      <select
        value={col.type}
        onChange={(e) =>
          engine.updateColumn(sectionId, col.key, { type: e.target.value as 'text' | 'number' })
        }
        className="field-input text-xs"
      >
        <option value="text">text</option>
        <option value="number">num</option>
      </select>
      <label className="flex items-center justify-center gap-1 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={col.editable}
          onChange={(e) => engine.updateColumn(sectionId, col.key, { editable: e.target.checked })}
        />
      </label>
      <button
        type="button"
        onClick={() => engine.removeColumn(sectionId, col.key)}
        className="text-xs text-red-400 hover:text-red-600"
        title="Eliminar columna"
      >
        ✕
      </button>
    </div>
  );
}

// ── Grouped Column Manager ──

function GroupedColumnManager({ section, engine }: { section: BuilderSection; engine: BuilderEngine }) {
  const groups = section.columnGroups ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase">
          Grupos ({groups.length})
        </span>
        <button
          type="button"
          onClick={() => engine.addColumnGroup(section.id)}
          className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800"
        >
          + Grupo
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-slate-400 italic">Sin grupos. Añade un grupo.</p>
      )}

      {groups.map((group) => (
        <div key={group.id} className="border border-slate-200 rounded-md mb-2 overflow-hidden">
          {/* Group header */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border-b border-slate-200">
            <input
              type="text"
              value={group.label}
              onChange={(e) =>
                engine.updateColumnGroup(section.id, group.id, { label: e.target.value })
              }
              className="field-input text-xs flex-1 font-semibold"
              placeholder="Nombre del grupo"
            />
            <button
              type="button"
              onClick={() => engine.addGroupChild(section.id, group.id)}
              className="px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-700"
            >
              + Sub-columna
            </button>
            <button
              type="button"
              onClick={() => engine.removeColumnGroup(section.id, group.id)}
              className="text-[10px] text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>

          {/* Group children */}
          {group.children.length === 0 && (
            <p className="text-[10px] text-slate-400 italic px-3 py-1">
              Sin sub-columnas. Haz clic en "+ Sub-columna".
            </p>
          )}

          {group.children.map((child) => (
            <div
              key={child.key}
              className="grid grid-cols-[1fr_2fr_70px_60px_30px] gap-1.5 items-center px-3 py-1 border-b border-slate-100"
            >
              <span className="text-[10px] text-slate-400 font-mono">{child.key}</span>
              <input
                type="text"
                value={child.label}
                onChange={(e) =>
                  engine.updateGroupChild(section.id, group.id, child.key, {
                    label: e.target.value,
                  })
                }
                className="field-input text-[11px] w-full"
              />
              <select
                value={child.type}
                onChange={(e) =>
                  engine.updateGroupChild(section.id, group.id, child.key, {
                    type: e.target.value as 'text' | 'number',
                  })
                }
                className="field-input text-[11px]"
              >
                <option value="text">text</option>
                <option value="number">num</option>
              </select>
              <label className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                <input
                  type="checkbox"
                  checked={child.editable}
                  onChange={(e) =>
                    engine.updateGroupChild(section.id, group.id, child.key, {
                      editable: e.target.checked,
                    })
                  }
                />
              </label>
              <button
                type="button"
                onClick={() => engine.removeGroupChild(section.id, group.id, child.key)}
                className="text-[10px] text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Row Manager ──

function getSectionColumns(section: BuilderSection): BuilderColumn[] {
  if (section.layout === 'grouped') {
    const result: BuilderColumn[] = [];
    for (const group of section.columnGroups ?? []) {
      for (const child of group.children) {
        result.push(child);
      }
    }
    return result;
  }
  return section.columns;
}

function RowManager({ section, engine }: { section: BuilderSection; engine: BuilderEngine }) {
  const columns = getSectionColumns(section);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase">
          Filas ({section.rows.length})
        </span>
        <button
          type="button"
          onClick={() => engine.addRow(section.id)}
          className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800"
        >
          + Fila
        </button>
      </div>

      {section.rows.length === 0 && (
        <p className="text-xs text-slate-400 italic">Sin filas. Añade una fila.</p>
      )}

      {section.rows.length > 0 && columns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr>
                <th className="border border-slate-200 px-1 py-1 bg-slate-100 text-slate-500 font-semibold w-8">#</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="border border-slate-200 px-1 py-1 bg-slate-100 text-slate-500 font-semibold"
                  >
                    <span className="text-[10px]">{col.label}</span>
                    {col.editable && <span className="text-[9px] text-blue-500 ml-0.5">✎</span>}
                  </th>
                ))}
                <th className="border border-slate-200 px-1 py-1 bg-slate-100 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, ri) => (
                <RowRow
                  key={row.id}
                  sectionId={section.id}
                  row={row}
                  columns={columns}
                  index={ri}
                  total={section.rows.length}
                  engine={engine}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RowRow({
  sectionId,
  row,
  columns,
  index,
  total,
  engine,
}: {
  sectionId: string;
  row: BuilderRow;
  columns: BuilderColumn[];
  index: number;
  total: number;
  engine: BuilderEngine;
}) {
  return (
    <tr>
      <td className="border border-slate-200 px-1 py-1 text-center text-slate-400 text-[10px]">
        {index + 1}
      </td>
      {columns.map((col) => {
        const val = row.cells[col.key] ?? '';
        return (
          <td key={col.key} className="border border-slate-200 px-1 py-0.5">
            {col.editable ? (
              <input
                type={col.type === 'number' ? 'number' : 'text'}
                value={val}
                onChange={(e) => engine.updateCell(sectionId, row.id, col.key, e.target.value)}
                className="field-input text-xs w-full"
                placeholder="—"
              />
            ) : (
              <input
                type="text"
                value={val}
                onChange={(e) => engine.updateCell(sectionId, row.id, col.key, e.target.value)}
                className="w-full text-xs text-slate-500 bg-transparent border-0 border-b border-dotted border-slate-300 px-1 py-0.5 outline-none focus:border-slate-600"
                placeholder="Texto fijo"
              />
            )}
          </td>
        );
      })}
      <td className="border border-slate-200 px-1 py-1 text-center">
        <div className="flex gap-0.5 justify-center">
          {index > 0 && (
            <button
              type="button"
              onClick={() => engine.moveRow(sectionId, row.id, -1)}
              className="text-[10px] text-slate-400 hover:text-slate-600"
            >
              ↑
            </button>
          )}
          {index < total - 1 && (
            <button
              type="button"
              onClick={() => engine.moveRow(sectionId, row.id, 1)}
              className="text-[10px] text-slate-400 hover:text-slate-600"
            >
              ↓
            </button>
          )}
          <button
            type="button"
            onClick={() => engine.removeRow(sectionId, row.id)}
            className="text-[10px] text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Footer Manager ──

function FooterManager({ section, engine }: { section: BuilderSection; engine: BuilderEngine }) {
  const footer = section.footer;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase">Pie de sección</span>
        {!footer && (
          <button
            type="button"
            onClick={() =>
              engine.updateFooter(section.id, {
                nota: '',
                input: { key: 'inline_input', label: 'Nota:', type: 'text' },
              })
            }
            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800"
          >
            + Añadir pie
          </button>
        )}
      </div>

      {footer && (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
              Nota / Instrucción
            </label>
            <textarea
              value={footer.nota ?? ''}
              onChange={(e) =>
                engine.updateFooter(section.id, { ...footer, nota: e.target.value })
              }
              className="field-input text-xs w-full"
              rows={2}
              placeholder="Texto de nota opcional..."
            />
          </div>
          {footer.input && (
            <div className="flex items-center gap-3">
              <label className="text-[10px] text-slate-400 font-semibold">Input label:</label>
              <input
                type="text"
                value={footer.input.label}
                onChange={(e) =>
                  engine.updateFooter(section.id, {
                    ...footer,
                    input: { ...footer.input!, label: e.target.value },
                  })
                }
                className="field-input text-xs flex-1"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => engine.updateFooter(section.id, undefined)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Eliminar pie
          </button>
        </div>
      )}
    </div>
  );
}