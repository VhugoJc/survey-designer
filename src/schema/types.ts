// ──────────────────────────────────────────────────────────
// FLEXIBLE TYPES for the Industrial Inspection Schema
//
// All interfaces use index signatures and optional fields
// so ANY report layout can be parsed without type errors.
// The known properties are typed; unknown ones pass through.
// ──────────────────────────────────────────────────────────

/** A single column (machine) definition inside a group */
export interface ColumnDef {
  key: string;
  label: string;
  [key: string]: unknown;
}

/** A group header that spans multiple columns */
export interface ColumnGroupHeader {
  label: string;
  colspan: number;
  columns: ColumnDef[];
  [key: string]: unknown;
}

/** Tolerance bounds for a measurement row */
export interface ToleranceDef {
  min?: number;
  max?: number;
  [key: string]: unknown;
}

/** Row definition inside a table — maximally flexible */
export interface TableRowDef {
  id: string;
  label?: string;
  unit?: string;
  rowType?: string;
  cells?: Record<string, unknown>;
  tolerance?: ToleranceDef;
  standards?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Conditional validation rule */
export interface ConditionalValidation {
  trigger?: string;
  requiredFields?: string[];
  style?: {
    outOfTolerance?: { bgColor?: string; borderColor?: string };
    inTolerance?: { bgColor?: string; borderColor?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** A table section definition */
export interface TableSection {
  id: string;
  title?: string;
  type?: string;
  table: {
    columnGroupHeaders: ColumnGroupHeader[];
    rows: TableRowDef[];
    [key: string]: unknown;
  };
  conditionalValidation?: ConditionalValidation;
  footerNotes?: string[];
  [key: string]: unknown;
}

/** Header field definition */
export interface HeaderFieldDef {
  type?: string;
  label?: string;
  default?: string;
  optional?: boolean;
  [key: string]: unknown;
}

/** Metadata field definition */
export interface MetadataFieldDef {
  type?: string;
  label?: string;
  format?: string;
  enum?: string[];
  [key: string]: unknown;
}

/** Top-level schema definition */
export interface ReportSchema {
  $schema?: string;
  schemaVersion?: string;
  meta?: {
    id?: string;
    name?: string;
    description?: string;
    [key: string]: unknown;
  };
  header?: Record<string, HeaderFieldDef>;
  metadata?: Record<string, MetadataFieldDef>;
  sections?: TableSection[];
  [key: string]: unknown;
}