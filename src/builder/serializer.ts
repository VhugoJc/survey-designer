import type {
  FormBuilderState,
  BuilderSection,
  BuilderColumn,
  BuilderColumnGroup,
  BuilderRow,
} from './types';

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/** Slugify a string into a snake_case key */
function toSnakeCase(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'col';
}

/** Generate a unique section ID */
function generateSectionId(index: number): string {
  return `sec_${index + 1}`;
}

/** Generate a unique row ID */
function generateRowId(sectionId: string, index: number): string {
  return `${sectionId}_row_${index + 1}`;
}

/** Generate a unique column key ensuring no duplicates */
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

// ──────────────────────────────────────────────────────────
// Build a single section's JSON output
// ──────────────────────────────────────────────────────────

function buildSectionJson(
  section: BuilderSection,
  sectionIndex: number,
): Record<string, unknown> {
  const sectionId = section.id || generateSectionId(sectionIndex);
  const usedKeys = new Set<string>();

  // Determine layout mode
  const isGrouped = section.layout === 'grouped' && (section.columnGroups?.length ?? 0) > 0;

  // 1a. GROUPED layout → build columnGroupHeaders
  if (isGrouped) {
    const columnGroupHeaders: Record<string, unknown>[] = (section.columnGroups ?? []).map(
      (group) => {
        const groupCols: Record<string, unknown>[] = group.children.map((col) => {
          const key = col.key || generateColumnKey([...usedKeys], col.label);
          usedKeys.add(key);
          return {
            key,
            label: col.label,
            editable: col.editable,
            type: col.type,
            cellType: col.editable ? (col.type === 'number' ? 'number-input' : 'text-input') : 'display',
            fieldRef: col.editable ? undefined : key,
          };
        });

        return {
          label: group.label,
          colspan: groupCols.length,
          columns: groupCols,
        };
      },
    );

    // Build rows
    const rows: Record<string, unknown>[] = section.rows.map((row, rowIndex) => {
      const rowId = row.id || generateRowId(sectionId, rowIndex);
      const rowObj: Record<string, unknown> = { id: rowId };

      for (const group of section.columnGroups ?? []) {
        for (const col of group.children) {
          const isEditable = col.editable;
          if (isEditable) {
            rowObj[col.key] = '';
          } else {
            rowObj[col.key] = row.cells?.[col.key] ?? '';
          }
        }
      }

      return rowObj;
    });

    const sectionJson: Record<string, unknown> = {
      id: sectionId,
      title: section.title,
      type: 'matrix-table',
      table: {
        columnGroupHeaders,
        rows,
      },
    };

    // Footer
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

  // 1b. FLAT layout (default)
  const columns: Record<string, unknown>[] = section.columns.map((col) => {
    const key = col.key || generateColumnKey([...usedKeys], col.label);
    usedKeys.add(key);
    return { key, label: col.label, editable: col.editable, type: col.type };
  });

  const rows: Record<string, unknown>[] = section.rows.map((row, rowIndex) => {
    const rowId = row.id || generateRowId(sectionId, rowIndex);
    const rowObj: Record<string, unknown> = { id: rowId };
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

  // Footer
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

// ──────────────────────────────────────────────────────────
// Main serializer
// ──────────────────────────────────────────────────────────

/**
 * Convert the Form Builder's visual state into a production-ready
 * JSON schema that is 100% compatible with our existing renderer.
 *
 * Guarantees:
 * - Every `editable: true` cell value is initialized to `""`
 * - Every row has a unique `id`
 * - Every section has a unique `id`
 * - Metadata fields have proper `key`, `label`, `type`, `format`
 * - Output matches the `document`-wrapper convention expected by SchemaEngine
 */
export function buildJsonSchema(state: FormBuilderState): Record<string, unknown> {
  // 1. Build metadata fields
  const metadata: Record<string, unknown> = {};
  for (const field of state.metadata) {
    const fieldDef: Record<string, unknown> = {
      type: field.type,
      label: field.label,
      key: field.key,
    };
    if (field.type === 'date') {
      fieldDef.format = 'date';
    }
    metadata[field.key] = fieldDef;
  }

  // 2. Build sections
  const sections: Record<string, unknown>[] = state.sections.map((sec, i) =>
    buildSectionJson(sec, i),
  );

  // 3. Build global observations
  let globalObservations: Record<string, unknown> | undefined;
  if (state.globalField) {
    globalObservations = {
      key: state.globalField.key || 'observaciones_finales',
      label: state.globalField.label || 'OBSERVACIONES:',
      type: 'textarea',
    };
  }

  // 4. Assemble top-level document
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

  if (globalObservations) {
    result.global_observations = globalObservations;
  }

  return result;
}

/**
 * Create a fresh, empty FormBuilderState with sensible defaults.
 */
export function createEmptyBuilderState(): FormBuilderState {
  return {
    document: {
      company: 'FEVISA',
      title: 'Nuevo Reporte',
    },
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

/**
 * Import an existing JSON schema into the FormBuilder state.
 * This allows editing previously created templates.
 */
export function importFromJsonSchema(json: Record<string, unknown>): FormBuilderState {
  const doc = json.document as Record<string, unknown> | undefined;

  // Metadata
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

  // Sections
  const rawSections = json.sections as Record<string, unknown>[] | undefined;
  const sections: FormBuilderState['sections'] = (rawSections ?? []).map((sec) => {
    const rawCols = sec.columns as Record<string, unknown>[] | undefined;
    const rawTable = sec.table as Record<string, unknown> | undefined;
    const rawGroupHeaders = rawTable?.columnGroupHeaders as Record<string, unknown>[] | undefined;
    const rawRows = (sec.rows ?? rawTable?.rows ?? []) as Record<string, unknown>[];
    const rawFooter = sec.footer as Record<string, unknown> | undefined;

    // Detect grouped layout
    const isGrouped = rawGroupHeaders !== undefined && rawGroupHeaders.length > 0;

    if (isGrouped) {
      // ── GROUPED layout ──
      const columnGroups: BuilderColumnGroup[] = (rawGroupHeaders ?? []).map((gh) => {
        const rawChildren = gh.columns as Record<string, unknown>[] | undefined;
        return {
          id: `grp_imported_${Math.random().toString(36).slice(2, 8)}`,
          label: (gh.label as string) ?? '',
          children: (rawChildren ?? []).map((col) => ({
            key: (col.key as string) ?? '',
            label: (col.label as string) ?? '',
            type: ((col.type as string) === 'number' ? 'number' : 'text') as 'text' | 'number',
            editable: (col.editable as boolean) ?? true,
          })),
        };
      });

      // Collect all child keys
      const allChildKeys = new Set<string>();
      for (const g of columnGroups) {
        for (const c of g.children) allChildKeys.add(c.key);
      }

      const rows: BuilderRow[] = (rawRows ?? []).map((row) => {
        const cells: Record<string, string> = {};
        for (const key of allChildKeys) {
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
        layout: 'grouped',
        columns: [],
        columnGroups,
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
    }

    // ── FLAT layout (default) ──
    const columns: BuilderColumn[] = (rawCols ?? []).map((col) => ({
      key: (col.key as string) ?? '',
      label: (col.label as string) ?? '',
      type: ((col.type as string) === 'number' ? 'number' : 'text') as 'text' | 'number',
      editable: (col.editable as boolean) ?? false,
    }));

    const rows: BuilderRow[] = (rawRows ?? []).map((row) => {
      const cells: Record<string, string> = {};
      for (const col of columns) {
        const val = (row as Record<string, unknown>)[col.key];
        cells[col.key] = val != null ? String(val) : '';
      }
      return {
        id: (row.id as string) ?? `row_${Math.random().toString(36).slice(2, 8)}`,
        cells,
      };
    });

    const section: BuilderSection = {
      id: (sec.id as string) ?? `sec_${Math.random().toString(36).slice(2, 8)}`,
      title: (sec.title as string) ?? '',
      layout: 'flat',
      columns,
      columnGroups: [],
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

  // Global field
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

// Re-export for convenience
export type { BuilderColumn, BuilderRow, BuilderSection, BuilderFooter, BuilderFooterInput } from './types';