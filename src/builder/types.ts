// ──────────────────────────────────────────────────────────
// Form Builder State — TypeScript interfaces
//
// Supports both FLAT columns and GROUPED column headers.
// ──────────────────────────────────────────────────────────

// ── Column definition in the builder ──
export type BuilderColumnType = 'text' | 'number' | 'checkbox' | 'textarea' | 'select';

export interface BuilderColumn {
  /** Unique key within the section (snake_case, auto-generated) */
  key: string;
  /** Display label shown in the rendered table header */
  label: string;
  /** Data type for editable columns */
  type: BuilderColumnType;
  /** Whether this column is user-editable or read-only */
  editable: boolean;
  /** Options for 'select' type columns */
  options?: string[];
}

// ── Column group (for grouped headers like M11 → ESTÁNDAR + LECTURA) ──
export interface BuilderColumnGroup {
  /** Unique ID (auto-generated) */
  id: string;
  /** Group header label (e.g. "M11", "TOLERANCIA") */
  label: string;
  /** Sub-columns inside this group */
  children: BuilderColumn[];
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

// ── Section layout mode ──
export type SectionLayout = 'flat' | 'grouped';

// ── Section in the builder ──
export interface BuilderSection {
  /** Unique ID (auto-generated, e.g. "sec_1") */
  id: string;
  /** Section title displayed as <h2> */
  title: string;
  /** Layout mode: flat columns or grouped column headers */
  layout: SectionLayout;
  /** Flat columns (used when layout === 'flat') */
  columns: BuilderColumn[];
  /** Grouped column headers (used when layout === 'grouped') */
  columnGroups: BuilderColumnGroup[];
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
  /** Form sections (each contains a flat table) */
  sections: BuilderSection[];
  /** Optional global observations / signature block at the bottom */
  globalField?: BuilderGlobalField;
}