// ──────────────────────────────────────────────────────────
// Form Builder State — Unified TypeScript interfaces
//
// A single Column model that handles both simple columns
// and grouped column headers (parent + children).
// ──────────────────────────────────────────────────────────

export type BuilderColumnType = 'text' | 'number' | 'checkbox' | 'textarea' | 'select';

export interface BuilderColumn {
  /** Unique ID within the section (auto-generated) */
  id: string;
  /** Display label shown in the rendered table header */
  label: string;
  /** Whether this column acts as a group header with children */
  isGroup?: boolean;
  /** Column key — present for non-group columns (snake_case, auto-generated) */
  key?: string;
  /** Data type for editable columns */
  type?: BuilderColumnType;
  /** Whether this column is user-editable or read-only */
  editable?: boolean;
  /** Options for 'select' type columns */
  options?: string[];
  /** Sub-columns (only when isGroup === true) */
  children?: BuilderColumn[];
}

// ── Row definition in the builder ──
export interface BuilderRow {
  /** Unique ID within the section (auto-generated) */
  id: string;
  /**
   * Cell values keyed by column key.
   * For `editable: true` columns, values MUST be `""` (empty string)
   * so React Hook Form can bind them.
   * For `editable: false` columns, values contain the static display text.
   */
  cells: Record<string, string>;
}

// ── Section footer input ──
export interface BuilderFooterInput {
  key: string;
  label: string;
  type: 'text';
}

// ── Section footer ──
export interface BuilderFooter {
  /** Optional note / instruction text */
  nota?: string;
  /** Optional single text input below the note */
  input?: BuilderFooterInput;
}

// ── Section in the builder ──
export interface BuilderSection {
  /** Unique ID (auto-generated, e.g. "sec_1") */
  id: string;
  /** Section title displayed as <h2> */
  title: string;
  /** Unified column list — each column can be simple or a group with children */
  columns: BuilderColumn[];
  /** Row data */
  rows: BuilderRow[];
  /** Optional footer (note + inline input) */
  footer?: BuilderFooter;
}

// ── Metadata field definition ──
export interface BuilderMetadataField {
  key: string;
  label: string;
  type: 'string' | 'date';
}

// ── Global observations field ──
export interface BuilderGlobalField {
  key: string;
  label: string;
  type: 'textarea';
}

// ── Top-level Form Builder state ──
export interface FormBuilderState {
  /** Document-level properties */
  document: {
    company: string;
    title: string;
  };
  /** Configurable metadata fields (date, machine, shift, operator, etc.) */
  metadata: BuilderMetadataField[];
  /** Form sections (each contains a unified table) */
  sections: BuilderSection[];
  /** Optional global observations / signature block at the bottom */
  globalField?: BuilderGlobalField;
}