import { useState, useMemo } from 'react';
import {
  FormBuilderState,
  BuilderSection,
  BuilderColumn,
  BuilderColumnGroup,
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

// ──────────────────────────────────────────────
// Hook — uses plain functions, NOT useCallback
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
  function addSection() {
    const sec: BuilderSection = {
      id: uid('sec'),
      title: 'Nueva Sección',
      layout: 'flat',
      columns: [],
      columnGroups: [],
      rows: [],
    };
    const next = { ...state, sections: [...state.sections, sec] };
    setState(next);
    pushHistory(next);
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

  function setSectionLayout(id: string, layout: 'flat' | 'grouped') {
    const next = {
      ...state,
      sections: state.sections.map((s) => {
        if (s.id !== id) return s;
        if (layout === 'grouped') {
          return { ...s, layout, columnGroups: s.columnGroups ?? [] };
        }
        return { ...s, layout, columns: s.columns ?? [] };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  // ── Column Groups ──
  function addColumnGroup(sectionId: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const gid = uid('grp');
        return {
          ...sec,
          columnGroups: [
            ...(sec.columnGroups ?? []),
            { id: gid, label: 'Nuevo Grupo', children: [] },
          ],
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function updateColumnGroup(
    sectionId: string,
    groupId: string,
    patch: Partial<BuilderColumnGroup>,
  ) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          columnGroups: (sec.columnGroups ?? []).map((g) =>
            g.id === groupId ? { ...g, ...patch } : g,
          ),
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function removeColumnGroup(sectionId: string, groupId: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const group = (sec.columnGroups ?? []).find((g) => g.id === groupId);
        if (!group) return sec;
        // Remove child column keys from all rows
        const keysToRemove = new Set(group.children.map((c) => c.key));
        return {
          ...sec,
          columnGroups: (sec.columnGroups ?? []).filter((g) => g.id !== groupId),
          rows: sec.rows.map((row) => {
            const newCells = { ...row.cells };
            for (const k of keysToRemove) delete newCells[k];
            return { ...row, cells: newCells };
          }),
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function addGroupChild(sectionId: string, groupId: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const groups = sec.columnGroups ?? [];
        const allKeys = new Set<string>();
        for (const g of groups) {
          for (const c of g.children) allKeys.add(c.key);
        }
        const key = uniqueKey([...allKeys], 'nuevo');
        return {
          ...sec,
          columnGroups: groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  children: [
                    ...g.children,
                    { key, label: 'Nuevo', type: 'text' as const, editable: false },
                  ],
                }
              : g,
          ),
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function updateGroupChild(
    sectionId: string,
    groupId: string,
    childKey: string,
    patch: Partial<BuilderColumn>,
  ) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          columnGroups: (sec.columnGroups ?? []).map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  children: g.children.map((c) =>
                    c.key === childKey ? { ...c, ...patch } : c,
                  ),
                }
              : g,
          ),
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function removeGroupChild(sectionId: string, groupId: string, childKey: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          columnGroups: (sec.columnGroups ?? []).map((g) =>
            g.id === groupId
              ? { ...g, children: g.children.filter((c) => c.key !== childKey) }
              : g,
          ),
          rows: sec.rows.map((row) => {
            const newCells = { ...row.cells };
            delete newCells[childKey];
            return { ...row, cells: newCells };
          }),
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  // ── Columns (flat mode) ──
  function addColumn(sectionId: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const existing = sec.columns.map((c) => c.key);
        const key = uniqueKey(existing, 'nuevo');
        return {
          ...sec,
          columns: [
            ...sec.columns,
            { key, label: 'Nuevo', type: 'text' as const, editable: false },
          ],
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function updateColumn(
    sectionId: string,
    colKey: string,
    patch: Partial<BuilderColumn>,
  ) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          columns: sec.columns.map((col) =>
            col.key === colKey ? { ...col, ...patch } : col,
          ),
        };
      }),
    };
    setState(next);
    pushHistory(next);
  }

  function removeColumn(sectionId: string, colKey: string) {
    const next = {
      ...state,
      sections: state.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const { [colKey]: _omit, ...rest } = Object.fromEntries(
          sec.rows.map((r) => [r.id, { ...r, cells: { ...r.cells } }]),
        );
        return {
          ...sec,
          columns: sec.columns.filter((c) => c.key !== colKey),
          rows: sec.rows.map((row) => {
            const newCells = { ...row.cells };
            delete newCells[colKey];
            return { ...row, cells: newCells };
          }),
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
        const cells: Record<string, string> = {};
        for (const col of sec.columns) {
          cells[col.key] = '';
        }
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

  function updateCell(
    sectionId: string,
    rowId: string,
    colKey: string,
    value: string,
  ) {
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
    setSectionLayout,
    addColumnGroup,
    updateColumnGroup,
    removeColumnGroup,
    addGroupChild,
    updateGroupChild,
    removeGroupChild,
    addColumn,
    updateColumn,
    removeColumn,
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
  };
}

export type BuilderEngine = ReturnType<typeof useBuilderState>;