import type { ReportSchema, TableSection, TableRowDef, ColumnGroupHeader } from '../schema/types';
import { ReportSchemaZod, buildFormValuesZod, type ReportSchemaParsed } from '../schema/validation';
import type { z } from 'zod';

/**
 * Normalize a schema from any supported format into our internal structure.
 * This allows the rest of the code to always work with a consistent shape.
 */
function normalizeSchema(raw: unknown): Record<string, unknown> {
  const obj = raw as Record<string, unknown>;

  // ── Detect format: "document" wrapper (lubrication) vs flat (pressure) ──
  const doc = obj.document as Record<string, unknown> | undefined;

  // Start building normalized output
  const out: Record<string, unknown> = {};

  // 1. Header
  if (obj.header) {
    out.header = obj.header;
  } else if (doc) {
    // Build header from document fields
    const header: Record<string, unknown> = {};
    header.companyName = { type: 'string', label: 'Empresa', default: doc.company ?? 'FEVISA' };
    header.reportTitle = { type: 'string', label: 'Título', default: doc.title ?? '' };
    out.header = header;
  } else {
    out.header = {};
  }

  // 2. Metadata
  if (obj.metadata) {
    out.metadata = obj.metadata;
  } else if (doc) {
    const meta = (doc as any).metadata as Record<string, unknown> | undefined;
    out.metadata = meta ?? {};
  } else {
    out.metadata = {};
  }

  // 3. Sections
  const rawSections = (obj.sections ?? []) as Record<string, unknown>[];
  const normalizedSections: Record<string, unknown>[] = [];

  for (const section of rawSections) {
    const ns: Record<string, unknown> = {
      id: section.id,
      title: section.title,
      type: section.type ?? 'matrix-table',
    };

    // Build table object
    const table: Record<string, unknown> = {};

    // Columns: check both section.columns and section.table.columns
    const sectionCols = section.columns as Record<string, unknown>[] | undefined;
    const tableCols = section.table
      ? (section.table as Record<string, unknown>).columns as Record<string, unknown>[] | undefined
      : undefined;
    const cols = sectionCols ?? tableCols;

    if (cols && cols.length > 0) {
      // Normalize each column: convert `editable` boolean → `cellType`
      const normalizedCols = cols.map((col) => {
        const nc: Record<string, unknown> = { ...col };
        const editable = col.editable as boolean | undefined;
        const colType = col.type as string | undefined;

        if (!nc.cellType) {
          if (editable === false) {
            nc.cellType = 'display';
            // Infer fieldRef from key if not set
            if (!nc.fieldRef) nc.fieldRef = col.key as string;
          } else if (editable === true) {
            if (colType === 'number') nc.cellType = 'number-input';
            else nc.cellType = 'text-input';
          }
        }
        return nc;
      });
      table.columns = normalizedCols;
    }

    // Column group headers (pressure format — pass through)
    const groupHeaders = section.table
      ? (section.table as Record<string, unknown>).columnGroupHeaders as Record<string, unknown>[] | undefined
      : undefined;
    if (groupHeaders && groupHeaders.length > 0) {
      table.columnGroupHeaders = groupHeaders;
    }

    // Rows: check both section.rows and section.table.rows
    const sectionRows = section.rows as Record<string, unknown>[] | undefined;
    const tableRows = section.table
      ? (section.table as Record<string, unknown>).rows as Record<string, unknown>[] | undefined
      : undefined;
    const rawRows = sectionRows ?? tableRows ?? [];

    // Auto-generate `id` for rows that lack it
    const normalizedRows = rawRows.map((r, idx) => {
      if (r.id) return r;
      return { ...r, id: `${section.id}_row_${idx + 1}` };
    });
    table.rows = normalizedRows;

    ns.table = table;

    // Footer notes + inline inputs: normalize `footer` object
    const footer = section.footer as Record<string, unknown> | undefined;
    if (footer) {
      if (footer.nota) {
        ns.footerNotes = [footer.nota as string];
      }
      if (footer.input) {
        ns.inlineInputs = [footer.input];
      }
    } else {
      // Pass through existing footerNotes / inlineInputs
      if (section.footerNotes) ns.footerNotes = section.footerNotes;
      if (section.inlineInputs) ns.inlineInputs = section.inlineInputs;
    }

    // Conditional validation (pass through)
    if (section.conditionalValidation) {
      ns.conditionalValidation = section.conditionalValidation;
    }

    normalizedSections.push(ns);
  }

  out.sections = normalizedSections;

  // 4. Global fields: normalize `global_observations` object → `globalFields` array
  if (obj.globalFields) {
    out.globalFields = obj.globalFields;
  } else if (obj.global_observations) {
    const go = obj.global_observations as Record<string, unknown>;
    out.globalFields = [go];
  }

  // 5. Pass through meta
  if (obj.meta) out.meta = obj.meta;
  if (obj.$schema) out.$schema = obj.$schema;
  if (obj.schemaVersion) out.schemaVersion = obj.schemaVersion;

  return out;
}

/**
 * SchemaEngine — loads, validates, and normalizes ANY report schema.
 */
export class SchemaEngine {
  private schema: ReportSchema;
  private parseResult: ReturnType<typeof ReportSchemaZod.safeParse>;

  constructor(raw: unknown) {
    // First normalize the raw input
    const normalized = normalizeSchema(raw);

    this.parseResult = ReportSchemaZod.safeParse(normalized);

    if (this.parseResult.success) {
      this.schema = this.parseResult.data as unknown as ReportSchema;
    } else {
      console.warn('[SchemaEngine] Zod parse warnings — using normalized fallback:', this.parseResult.error.issues);
      this.schema = normalized as unknown as ReportSchema;
    }
  }

  get isValid(): boolean {
    return this.parseResult.success;
  }

  get validationErrors() {
    return this.parseResult.success ? [] : this.parseResult.error.issues;
  }

  getSchema(): ReportSchema {
    return this.schema;
  }

  getHeaderFields() {
    const header = this.schema.header ?? {};
    return Object.entries(header).map(([key, def]) => ({
      key,
      ...(def as Record<string, unknown>),
    }));
  }

  getMetadataFields() {
    const metadata = this.schema.metadata ?? {};
    return Object.entries(metadata).map(([key, def]) => ({
      key,
      ...(def as Record<string, unknown>),
    }));
  }

  getSections(): TableSection[] {
    return this.schema.sections ?? [];
  }

  getSection(id: string): TableSection | undefined {
    return (this.schema.sections ?? []).find((s) => s.id === id);
  }

  getColumnGroups(sectionId: string): ColumnGroupHeader[] | undefined {
    return this.getSection(sectionId)?.table?.columnGroupHeaders;
  }

  getRows(sectionId: string): TableRowDef[] | undefined {
    return this.getSection(sectionId)?.table?.rows;
  }

  getAllMachineKeys(): string[] {
    const keys = new Set<string>();
    for (const section of this.getSections()) {
      for (const group of section.table?.columnGroupHeaders ?? []) {
        for (const col of group.columns ?? []) {
          if (col.key) keys.add(col.key);
        }
      }
    }
    return Array.from(keys);
  }

  getTolerance(row: TableRowDef, _machineKey?: string): { min: number; max: number } | null {
    if (row.tolerance && typeof row.tolerance.min === 'number' && typeof row.tolerance.max === 'number') {
      return { min: row.tolerance.min, max: row.tolerance.max };
    }
    return null;
  }

  getConditionalValidation(sectionId: string) {
    const section = this.getSection(sectionId);
    return section?.conditionalValidation ?? null;
  }

  buildFormValuesSchema(): z.ZodObject<any> {
    return buildFormValuesZod(this.parseResult.success ? this.parseResult.data : this.schema as unknown as ReportSchemaParsed);
  }
}