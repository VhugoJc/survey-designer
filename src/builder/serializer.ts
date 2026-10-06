import type {
  FormBuilderState,
  BuilderSection,
  BuilderColumn,
  BuilderRow,
} from './types';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function toSnakeCase(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'col'
  );
}

function generateColumnKey(existing: string[], label: string): string {
  let base = toSnakeCase(label);
  if (!base) base = 'col';
  let key = base;
  let counter = 1;
  while (existing.includes(key)) {
    key = `${base}_${counter}`;
    counter++;
  }
  return key;
}

function mapCellType(col: BuilderColumn): string {
  if (!col.editable) return 'display';
  switch (col.type) {
    case 'number': return 'number-input';
    case 'checkbox': return 'checkbox';
    case 'textarea': return 'textarea';
    case 'select': return 'select';
    default: return 'text-input';
  }
}

// ──────────────────────────────────────────────
// Build a single section's JSON output
// ──────────────────────────────────────────────

function buildSectionJson(
  section: BuilderSection,
  sectionIndex: number,
): Record<string, unknown> {
  const sectionId = section.id;
  const usedKeys = new Set<string>();

  // Detect if any column is a group
  const hasGroups = section.columns.filter((c) => c.isGroup).length > 0;

  if (hasGroups) {
    // ── GROUPED layout ──
    const columnGroupHeaders: Record<string, unknown>[] = section.columns.map((col) => {
      if (col.isGroup && col.children) {
        const groupCols: Record<string, unknown>[] = col.children.map((child) => {
          const key = child.key || generateColumnKey([...usedKeys], child.label);
          usedKeys.add(key);
          return {
            key,
            label: child.label,
            editable: child.editable,
            type: child.type,
            cellType: mapCellType(child),
            fieldRef: child.editable ? undefined : key,
            ...(child.options ? { options: child.options } : {}),
          };
        });
        return {
          label: col.label,
          colspan: groupCols.length,
          columns: groupCols,
        };
      } else {
        // Single column rendered as a group of 1
        const key = col.key || generateColumnKey([...usedKeys], col.label);
        usedKeys.add(key);
        return {
          label: col.label,
          colspan: 1,
          columns: [{
            key,
            label: col.label,
            editable: col.editable,
            type: col.type,
            cellType: mapCellType(col),
            fieldRef: col.editable ? undefined : key,
            ...(col.options ? { options: col.options } : {}),
          }],
        };
      }
    });

    const rows: Record<string, unknown>[] = section.rows.map((row) => {
      const rowObj: Record<string, unknown> = { id: row.id };
      for (const col of section.columns) {
        if (col.isGroup && col.children) {
          for (const child of col.children) {
            const ck = child.key || '';
            rowObj[ck] = child.editable ? '' : (row.cells?.[ck] ?? '');
          }
        } else {
          const ck = col.key || '';
          rowObj[ck] = col.editable ? '' : (row.cells?.[ck] ?? '');
        }
      }
      return rowObj;
    });

    const sectionJson: Record<string, unknown> = {
      id: sectionId,
      title: section.title,
      type: 'matrix-table',
      table: { columnGroupHeaders, rows },
    };

    if (section.footer) {
      const footer: Record<string, unknown> = {};
      if (section.footer.nota) footer.nota = section.footer.nota;
      if (section.footer.input) {
        footer.input = {
          key: section.footer.input.key || 'inline_input',
          label: section.footer.input.label || 'Nota:',
          type: 'text',
        };
      }
      if (Object.keys(footer).length > 0) sectionJson.footer = footer;
    }

    return sectionJson;
  }

  // ── FLAT layout (no groups) ──
  const columns: Record<string, unknown>[] = section.columns.map((col) => {
    const key = col.key || generateColumnKey([...usedKeys], col.label);
    usedKeys.add(key);
    return {
      key,
      label: col.label,
      editable: col.editable,
      type: col.type,
      cellType: mapCellType(col),
      ...(col.options ? { options: col.options } : {}),
    };
  });

  const rows: Record<string, unknown>[] = section.rows.map((row) => {
    const rowObj: Record<string, unknown> = { id: row.id };
    for (const col of columns) {
      const colKey = col.key as string;
      const isEditable = col.editable as boolean;
      rowObj[colKey] = isEditable ? '' : (row.cells?.[colKey] ?? '');
    }
    return rowObj;
  });

  const sectionJson: Record<string, unknown> = {
    id: sectionId,
    title: section.title,
    type: 'flat_table',
    columns,
    rows,
  };

  if (section.footer) {
    const footer: Record<string, unknown> = {};
    if (section.footer.nota) footer.nota = section.footer.nota;
    if (section.footer.input) {
      footer.input = {
        key: section.footer.input.key || 'inline_input',
        label: section.footer.input.label || 'Nota:',
        type: 'text',
      };
    }
    if (Object.keys(footer).length > 0) sectionJson.footer = footer;
  }

  return sectionJson;
}

// ──────────────────────────────────────────────
// Main serializer
// ──────────────────────────────────────────────

export function buildJsonSchema(state: FormBuilderState): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  for (const field of state.metadata) {
    const fieldDef: Record<string, unknown> = {
      type: field.type,
      label: field.label,
      key: field.key,
    };
    if (field.type === 'date') fieldDef.format = 'date';
    metadata[field.key] = fieldDef;
  }

  const sections: Record<string, unknown>[] = state.sections.map((sec, i) =>
    buildSectionJson(sec, i),
  );

  let globalObservations: Record<string, unknown> | undefined;
  if (state.globalField) {
    globalObservations = {
      key: state.globalField.key || 'observaciones_finales',
      label: state.globalField.label || 'OBSERVACIONES:',
      type: 'textarea',
    };
  }

  const result: Record<string, unknown> = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    schemaVersion: '1.0',
    document: {
      company: state.document.company || 'FEVISA',
      title: state.document.title || 'Untitled Report',
      metadata,
    },
    sections,
  };

  if (globalObservations) result.global_observations = globalObservations;

  return result;
}

export function createEmptyBuilderState(): FormBuilderState {
  return {
    document: { company: 'FEVISA', title: 'Nuevo Reporte' },
    metadata: [
      { key: 'fecha', label: 'FECHA:', type: 'date' },
      { key: 'maquina', label: 'MÁQUINA:', type: 'string' },
      { key: 'firma', label: 'FIRMA:', type: 'string' },
    ],
    sections: [],
    globalField: {
      key: 'observaciones_finales',
      label: 'OBSERVACIONES:',
      type: 'textarea',
    },
  };
}

export function importFromJsonSchema(json: Record<string, unknown>): FormBuilderState {
  const doc = json.document as Record<string, unknown> | undefined;

  const rawMetadata = doc?.metadata as Record<string, unknown> | undefined;
  const metadata: FormBuilderState['metadata'] = [];
  if (rawMetadata) {
    for (const [key, def] of Object.entries(rawMetadata)) {
      const d = def as Record<string, unknown>;
      metadata.push({
        key,
        label: (d.label as string) ?? key,
        type: (d.format as string) === 'date' ? 'date' : 'string',
      });
    }
  }

  const rawSections = json.sections as Record<string, unknown>[] | undefined;
  const sections: FormBuilderState['sections'] = (rawSections ?? []).map((sec) => {
    const rawTable = sec.table as Record<string, unknown> | undefined;
    const rawGroupHeaders = rawTable?.columnGroupHeaders as Record<string, unknown>[] | undefined;
    const rawCols = sec.columns as Record<string, unknown>[] | undefined;
    const rawRows = (sec.rows ?? rawTable?.rows ?? []) as Record<string, unknown>[];
    const rawFooter = sec.footer as Record<string, unknown> | undefined;

    const isGrouped = rawGroupHeaders !== undefined && rawGroupHeaders.length > 0;

    let columns: BuilderColumn[];

    if (isGrouped) {
      columns = (rawGroupHeaders ?? []).map((gh) => {
        const rawChildren = gh.columns as Record<string, unknown>[] | undefined;
        return {
          id: `grp_${Math.random().toString(36).slice(2, 8)}`,
          label: (gh.label as string) ?? '',
          isGroup: true,
          children: (rawChildren ?? []).map((col) => ({
            id: `child_${Math.random().toString(36).slice(2, 8)}`,
            key: (col.key as string) ?? '',
            label: (col.label as string) ?? '',
            type: ((col.type as string) === 'number' ? 'number' : 'text') as any,
            editable: (col.editable as boolean) ?? true,
          })),
        };
      });
    } else {
      columns = (rawCols ?? []).map((col) => ({
        id: `col_${Math.random().toString(36).slice(2, 8)}`,
        key: (col.key as string) ?? '',
        label: (col.label as string) ?? '',
        type: ((col.type as string) === 'number' ? 'number' : 'text') as any,
        editable: (col.editable as boolean) ?? false,
      }));
    }

    const allKeys = new Set<string>();
    for (const col of columns) {
      if (col.isGroup && col.children) {
        for (const c of col.children) { if (c.key) allKeys.add(c.key); }
      } else if (col.key) {
        allKeys.add(col.key);
      }
    }

    const rows: BuilderRow[] = (rawRows ?? []).map((row) => {
      const cells: Record<string, string> = {};
      for (const key of allKeys) {
        const val = (row as Record<string, unknown>)[key];
        cells[key] = val != null ? String(val) : '';
      }
      return {
        id: (row.id as string) ?? `row_${Math.random().toString(36).slice(2, 8)}`,
        cells,
      };
    });

    const section: BuilderSection = {
      id: (sec.id as string) ?? `sec_${Math.random().toString(36).slice(2, 8)}`,
      title: (sec.title as string) ?? '',
      columns,
      rows,
    };

    if (rawFooter) {
      section.footer = {
        nota: rawFooter.nota as string | undefined,
        input: rawFooter.input
          ? {
              key: (rawFooter.input as Record<string, unknown>).key as string,
              label: (rawFooter.input as Record<string, unknown>).label as string,
              type: 'text',
            }
          : undefined,
      };
    }

    return section;
  });

  const rawGlobal = json.global_observations as Record<string, unknown> | undefined;
  let globalField: FormBuilderState['globalField'] | undefined;
  if (rawGlobal) {
    globalField = {
      key: (rawGlobal.key as string) ?? 'observaciones_finales',
      label: (rawGlobal.label as string) ?? 'OBSERVACIONES:',
      type: 'textarea',
    };
  }

  return {
    document: {
      company: (doc?.company as string) ?? 'FEVISA',
      title: (doc?.title as string) ?? '',
    },
    metadata,
    sections,
    globalField,
  };
}