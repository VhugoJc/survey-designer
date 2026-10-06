import { useState, useMemo } from 'react';
import {
  FormBuilderState,
  BuilderSection,
  BuilderColumn,
  BuilderColumnType,
  BuilderRow,
  BuilderFooter,
  BuilderMetadataField,
  BuilderGlobalField,
  createEmptyBuilderState,
} from '../index';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let _idCounter = 0;
function uid(prefix: string): string {
  _idCounter++;
  return `${prefix}_${_idCounter}`;
}

function toSnakeCase(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'col'
  );
}

function uniqueKey(existing: string[], label: string): string {
  let base = toSnakeCase(label);
  if (!base) base = 'col';
  let key = base;
  let c = 1;
  while (existing.includes(key)) {
    key = `${base}_${c}`;
    c++;
  }
  return key;
}

/** Get all leaf-level column keys from a section (recurses into groups) */
function getAllColumnKeys(section: BuilderSection): string[] {
  const keys: string[] = [];
  for (const col of section.columns) {
    if (col.isGroup && col.children) {
      for (const child of col.children) {
        if (child.key) keys.push(child.key);
      }
    } else if (col.key) {
      keys.push(col.key);
    }
  }
  return keys;
}

/** Get all leaf-level columns from a section */
function getAllLeafColumns(section: BuilderSection): BuilderColumn[] {
  const cols: BuilderColumn[] = [];
  for (const col of section.columns) {
    if (col.isGroup && col.children) {
      for (const child of col.children) cols.push(child);
    } else {
      cols.push(col);
    }
  }
  return cols;
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export function useBuilderState(initial?: FormBuilderState) {
  const [state, setState] = useState<FormBuilderState>(
    initial ?? createEmptyBuilderState(),
  );
  const [history, setHistory] = useState<FormBuilderState[]>([
    structuredClone(initial ?? createEmptyBuilderState()),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  function pushHistory(newState: FormBuilderState) {
    const idx = historyIndex;
    const truncated = history.slice(0, idx + 1);
    truncated.push(structuredClone(newState));
    setHistory(truncated);
    setHistoryIndex(truncated.length - 1);
  }

  // ── Document ──
  function setCompany(v: string) {
    const next = { ...state, document: { ...state.document, company: v } };
    setState(next);
    pushHistory(next);
  }

  function setTitle(v: string) {
    const next = { ...state, document: { ...state.document, title: v } };
    setState(next);
    pushHistory(next);
  }

  // ── Sections ──
  function addSection(title?: string): string {
    const sec: BuilderSection = {
      id: uid('sec'),
      title: title ?? 'Nueva Sección',
      columns: [],
      rows: [],
    };
    const next = { ...state, sections: [...state.sections, sec] };
    setState(next);
    pushHistory(next);
    return sec.id;
  }

  function removeSection(id: string) {
    const next = {
      ...state,
      sections: state.sections.filter((s) => s.id !== id),
    };
    setState(next);
    pushHistory(next);
  }

  function moveSection(id: string, direction: -1 | 1) {
    const idx = state.sections.map((s) => s.id).indexOf(id);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= state.sections.length) return;
    const arr = [...state.sections];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    const next = { ...state, sections: arr };
    setState(next);
    pushHistory(next);
  }

  function updateSectionTitle(id: string, title: string) {
    const next = {
      ...state,
      sections: state.sections.map((s) => (s.id === id ? { ...s, title } : s)),
    };
    setState(next);
    pushHistory(next);
  }

  // ── Unified Columns ──
  function addColumn(sectionId: string) {
    const key = uid('col');
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          columns: [
            ...sec.columns,
            { id: uid('col_def'), label: 'Nuevo', key, type: 'text' as BuilderColumnType, editable: false },
          ],
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function addColumnGroup(sectionId: string): string {
    const gid = uid('grp');
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          columns: [
            ...sec.columns,
            { id: gid, label: 'Nuevo Grupo', isGroup: true, children: [] },
          ],
        };
      }),
    };
    setState(next);
    pushHistory(next);
    return gid;
  }

  function updateColumn(sectionId: string, colId: string, patch: Partial<BuilderColumn>) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          columns: sec.columns.map((col) => {
            if (col.id === colId) return { ...col, ...patch };
            // Check inside group children
            if (col.isGroup && col.children) {
              return {
                ...col,
                children: col.children.map((child) =>
                  child.id === colId ? { ...child, ...patch } : child,
                ),
              };
            }
            return col;
          }),
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function removeColumn(sectionId: string, colId: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        // Check if it's a top-level column or a group child
        const isTopLevel = sec.columns.some((c) => c.id === colId);
        let keysToRemove = new Set<string>();

        if (isTopLevel) {
          const col = sec.columns.find((c) => c.id === colId);
          if (col) {
            if (col.isGroup && col.children) {
              for (const c of col.children) { if (c.key) keysToRemove.add(c.key); }
            } else if (col.key) {
              keysToRemove.add(col.key);
            }
          }
          return {
            ...sec,
            columns: sec.columns.filter((c) => c.id !== colId),
            rows: sec.rows.map((row) => {
              const newCells = { ...row.cells };
              for (const k of keysToRemove) delete newCells[k];
              return { ...row, cells: newCells };
            }),
          };
        }

        // It's a group child — find which group it belongs to
        let childKey = '';
        const newColumns = sec.columns.map((col) => {
          if (!col.isGroup || !col.children) return col;
          const child = col.children.find((c) => c.id === colId);
          if (child && child.key) childKey = child.key;
          return {
            ...col,
            children: col.children.filter((c) => c.id !== colId),
          };
        });
        return {
          ...sec,
          columns: newColumns,
          rows: childKey
            ? sec.rows.map((row) => {
                const newCells = { ...row.cells };
                delete newCells[childKey];
                return { ...row, cells: newCells };
              })
            : sec.rows,
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  // ── Group children ──
  function addGroupChild(sectionId: string, groupId: string) {
    const key = uid('col');
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          columns: sec.columns.map((col) => {
            if (col.id !== groupId || !col.isGroup) return col;
            const child: BuilderColumn = {
              id: uid('child'),
              label: 'Nuevo',
              key,
              type: 'text' as BuilderColumnType,
              editable: false,
            };
            return {
              ...col,
              children: [...(col.children ?? []), child],
            };
          }),
          rows: sec.rows.map((row) => ({
            ...row,
            cells: { ...row.cells, [key]: '' },
          })),
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function removeGroupChild(sectionId: string, groupId: string, childId: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        let removedKey = '';
        const newColumns = sec.columns.map((col) => {
          if (col.id !== groupId || !col.isGroup) return col;
          const child = col.children?.find((c) => c.id === childId);
          if (child?.key) removedKey = child.key;
          return {
            ...col,
            children: col.children?.filter((c) => c.id !== childId) ?? [],
          };
        });
        return {
          ...sec,
          columns: newColumns,
          rows: removedKey
            ? sec.rows.map((row) => {
                const newCells = { ...row.cells };
                delete newCells[removedKey];
                return { ...row, cells: newCells };
              })
            : sec.rows,
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  // ── Rows ──
  function addRow(sectionId: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const keys = getAllColumnKeys(sec);
        const cells: Record<string, string> = {};
        for (const key of keys) cells[key] = '';
        return {
          ...sec,
          rows: [...sec.rows, { id: uid(`${sectionId}_row`), cells }],
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function removeRow(sectionId: string, rowId: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return { ...sec, rows: sec.rows.filter((r) => r.id !== rowId) };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function moveRow(sectionId: string, rowId: string, direction: -1 | 1) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const idx = sec.rows.map((r) => r.id).indexOf(rowId);
        if (idx < 0) return sec;
        const target = idx + direction;
        if (target < 0 || target >= sec.rows.length) return sec;
        const arr = [...sec.rows];
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        return { ...sec, rows: arr };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function updateCell(sectionId: string, rowId: string, colKey: string, value: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          rows: sec.rows.map((row) => {
            if (row.id !== rowId) return row;
            return { ...row, cells: { ...row.cells, [colKey]: value } };
          }),
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  // ── Footer ──
  function updateFooter(sectionId: string, footer: BuilderFooter | undefined) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return { ...sec, footer };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  // ── Metadata ──
  function addMetadataField() {
    const key = uid('meta');
    const next = {
      ...state,
      metadata: [
        ...state.metadata,
        { key, label: 'Nuevo campo', type: 'string' as const },
      ],
    };
    setState(next);
    pushHistory(next);
  }

  function updateMetadataField(key: string, patch: Partial<BuilderMetadataField>) {
    const next = {
      ...state,
      metadata: state.metadata.map((f) =>
        f.key === key ? { ...f, ...patch } : f,
      ),
    };
    setState(next);
    pushHistory(next);
  }

  function removeMetadataField(key: string) {
    const next = {
      ...state,
      metadata: state.metadata.filter((f) => f.key !== key),
    };
    setState(next);
    pushHistory(next);
  }

  // ── Global Field ──
  function setGlobalField(gf: BuilderGlobalField | undefined) {
    const next = { ...state, globalField: gf };
    setState(next);
    pushHistory(next);
  }

  function updateGlobalField(patch: Partial<BuilderGlobalField>) {
    const current = state.globalField ?? {
      key: 'observaciones_finales',
      label: 'OBSERVACIONES:',
      type: 'textarea' as const,
    };
    const next = { ...state, globalField: { ...current, ...patch } };
    setState(next);
    pushHistory(next);
  }

  // ── Undo / Redo ──
  const canUndo = useMemo(() => historyIndex > 0, [historyIndex]);
  const canRedo = useMemo(
    () => historyIndex < history.length - 1,
    [historyIndex, history.length],
  );

  function undo() {
    if (!canUndo) return;
    const newIdx = historyIndex - 1;
    setHistoryIndex(newIdx);
    setState(structuredClone(history[newIdx]));
  }

  function redo() {
    if (!canRedo) return;
    const newIdx = historyIndex + 1;
    setHistoryIndex(newIdx);
    setState(structuredClone(history[newIdx]));
  }

  return {
    getState: () => state,
    setCompany,
    setTitle,
    addSection,
    removeSection,
    moveSection,
    updateSectionTitle,
    addColumn,
    addColumnGroup,
    updateColumn,
    removeColumn,
    addGroupChild,
    removeGroupChild,
    addRow,
    removeRow,
    moveRow,
    updateCell,
    updateFooter,
    addMetadataField,
    updateMetadataField,
    removeMetadataField,
    setGlobalField,
    updateGlobalField,
    canUndo,
    canRedo,
    undo,
    redo,
    getAllLeafColumns: (sectionId: string) => {
      const sec = state.sections.find((s) => s.id === sectionId);
      return sec ? getAllLeafColumns(sec) : [];
    },
  };
}

export type BuilderEngine = ReturnType<typeof useBuilderState>;