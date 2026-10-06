import { z } from 'zod';

// ──────────────────────────────────────────────────────────
// FLEXIBLE SCHEMA VALIDATION
//
// We validate only the structural skeleton of a report schema.
// All row/cell/column content is treated as loose/passthrough
// so that ANY report layout (pressure, lubrication, checklists,
// dropdowns, etc.) can be loaded without ZodError.
// ──────────────────────────────────────────────────────────

// ── Column & Group (loose — extra props allowed) ──
const ColumnDefSchema = z.object({
  key: z.string(),
  label: z.string(),
}).passthrough();

const ColumnGroupHeaderSchema = z.object({
  label: z.string(),
  colspan: z.number().int().positive().optional().default(1),
  columns: z.array(ColumnDefSchema).optional().default([]),
}).passthrough();

// ── Row — maximally flexible ──
// A row can have ANY properties. We only guarantee `id` exists.
// `rowType`, `cells`, `tolerance`, `standards`, `unit`, etc.
// are all optional and pass through without validation.
const TableRowDefSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  unit: z.string().optional(),
  rowType: z.string().optional(),
  cells: z.record(z.string(), z.any()).optional(),
  tolerance: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).passthrough().optional(),
  standards: z.record(z.string(), z.any()).optional(),
}).passthrough();

// ── Conditional validation (loose) ──
const ConditionalValidationSchema = z.object({
  trigger: z.string().optional(),
  requiredFields: z.array(z.string()).optional().default([]),
  style: z.any().optional(),
}).passthrough();

// ── Table section — flexible ──
const TableSectionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  type: z.string().optional().default('matrix-table'),
  table: z.object({
    columnGroupHeaders: z.array(ColumnGroupHeaderSchema).optional().default([]),
    columns: z.array(ColumnDefSchema).optional().default([]),
    rows: z.array(TableRowDefSchema).optional().default([]),
  }).passthrough().optional().default({}),
  conditionalValidation: ConditionalValidationSchema.optional(),
  footerNotes: z.array(z.string()).optional(),
  inlineInputs: z.array(z.object({
    key: z.string(),
    label: z.string().optional(),
  }).passthrough()).optional(),
  rows: z.array(TableRowDefSchema).optional(),
}).passthrough();

// ── Header / Metadata fields ──
const HeaderFieldDefSchema = z.object({
  type: z.string().optional(),
  label: z.string().optional(),
  default: z.string().optional(),
  optional: z.boolean().optional(),
}).passthrough();

const MetadataFieldDefSchema = z.object({
  type: z.string().optional(),
  label: z.string().optional(),
  format: z.string().optional(),
  enum: z.array(z.string()).optional(),
}).passthrough();

// ── Top-level schema — validates skeleton only ──
export const ReportSchemaZod = z.object({
  $schema: z.string().optional(),
  schemaVersion: z.string().optional(),
  meta: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
  }).passthrough().optional().default({}),
  header: z.record(z.string(), HeaderFieldDefSchema).optional().default({}),
  metadata: z.record(z.string(), MetadataFieldDefSchema).optional().default({}),
  sections: z.array(TableSectionSchema).optional().default([]),
  globalFields: z.array(z.object({
    key: z.string(),
    label: z.string().optional(),
    type: z.string().optional(),
  }).passthrough()).optional(),
}).passthrough();

export type ReportSchemaParsed = z.infer<typeof ReportSchemaZod>;

// ──────────────────────────────────────────────────────────
// DYNAMIC FORM VALUES VALIDATION
//
// At runtime, inspects the loaded schema's row definitions
// and generates the appropriate Zod shape for form data.
// ──────────────────────────────────────────────────────────

/**
 * Dynamically build a Zod schema for form values based on
 * the loaded report schema. This replaces the old static
 * approach and supports any rowType.
 */
export function buildFormValuesZod(schema: ReportSchemaParsed): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  // Header fields → strings
  if (schema.header) {
    for (const key of Object.keys(schema.header)) {
      shape[`header.${key}`] = z.string().optional().default('');
    }
  }

  // Metadata fields → strings (or dates)
  if (schema.metadata) {
    for (const key of Object.keys(schema.metadata)) {
      shape[`metadata.${key}`] = z.string().optional().default('');
    }
  }

  // Section rows → dynamic based on rowType
  if (schema.sections) {
    for (const section of schema.sections) {
      const sectionId = section.id;
      const rows = section.table?.rows ?? [];

      // Detect flat vs grouped columns
      const flatCols = (section.table as any)?.columns as Record<string, unknown>[] | undefined;
      const hasFlatCols = flatCols && flatCols.length > 0;

      for (const row of rows) {
        const rowId = row.id;
        const rowType = row.rowType ?? 'measurement';

        // Determine which machine keys exist
        let machineKeys: string[] = [];

        if (hasFlatCols) {
          machineKeys = flatCols!.map((c) => c.key as string);
        } else {
          for (const group of section.table?.columnGroupHeaders ?? []) {
            for (const col of group.columns ?? []) {
              if (col.key) machineKeys.push(col.key);
            }
          }
        }

        for (const machineKey of machineKeys) {
          const basePath = `sections.${sectionId}.rows.${rowId}.cells.${machineKey}`;

          if (rowType === 'checklist') {
            shape[`${basePath}.checked`] = z.boolean().optional().default(false);
          } else {
            // Determine cell type from column definition
            let cellType = 'number-input';
            if (hasFlatCols) {
              const colDef = flatCols!.find((c) => c.key === machineKey);
              if (colDef && colDef.cellType) cellType = colDef.cellType as string;
            }

            if (cellType === 'text-input' || cellType === 'textarea') {
              shape[`${basePath}.value`] = z.string().optional().default('');
            } else {
              shape[`${basePath}.value`] = z.union([z.number(), z.null()]).optional().default(null);
            }

            const condFields = section.conditionalValidation?.requiredFields
              ?? ['observation', 'correction', 'countermeasure'];

            for (const field of condFields) {
              shape[`${basePath}.${field}`] = z.string().nullable().optional().default(null);
            }
          }
        }
      }

      // Inline inputs
      const inlineInputs = (section as any).inlineInputs as Array<{ key: string }> | undefined;
      if (inlineInputs) {
        for (const ii of inlineInputs) {
          shape[`sections.${sectionId}.inlineInputs.${ii.key}`] = z.string().optional().default('');
        }
      }
    }
  }

  // Global fields
  const globalFields = (schema as any).globalFields as Array<{ key: string; type?: string }> | undefined;
  if (globalFields) {
    for (const gf of globalFields) {
      shape[`global.${gf.key}`] = z.string().optional().default('');
    }
  }

  return z.object(shape).passthrough();
}