# FEVISA — Architecture

> This document describes the current architecture as implemented. It is not aspirational.

---

## 1. High-Level Architecture

The application is a single-page React app with two operational modes toggled by a state variable:

```
┌─────────────────────────────────────────────────┐
│                    App.tsx                       │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │ Ver Reporte  │    │ Diseñador de         │   │
│  │ (render)     │    │ Formularios (design) │   │
│  └──────────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────────┘
```

- **Render mode** (`mode='render'`): Loads a JSON schema → `SchemaEngine` normalizes it → `useFormEngine` creates React Hook Form state → renders `HeaderForm`, `MetadataForm`, `MatrixTable` (per section), `GlobalFields`.
- **Design mode** (`mode='design'`): Instantiates `FormBuilderApp` with an empty state → user edits sections/columns/rows via modals → can preview via `LivePreview` or export JSON via `buildJsonSchema`.

---

## 2. Data Flow

### Render Mode
```
JSON Schema (static import)
  → SchemaEngine (normalize + Zod validate)
    → useFormEngine (build defaults + Zod resolver)
      → FormProvider (react-hook-form context)
        → HeaderForm, MetadataForm, MatrixTable, GlobalFields
```

### Design Mode
```
FormBuilderApp
  → useBuilderState (mutable state + undo/redo history)
    → User edits via modals (ColumnConfigModal, RowConfigModal, etc.)
      → buildJsonSchema(state) → JSON output
        → LivePreview (re-renders via SchemaEngine + useFormEngine)
```

---

## 3. State Management

### Renderer State (`useFormEngine`)
- Uses `react-hook-form`'s `useForm()` with `onChange` mode.
- Form values are stored in a flat key-value structure (e.g., `sections.sec_1.rows.row_1.cells.m11_val.value`).
- A Zod schema is dynamically built at runtime via `buildFormValuesZod()` based on the loaded schema's structure.
- `zodResolver` from `@hookform/resolvers` validates form data against the dynamic Zod schema.

### Builder State (`useBuilderState`)
- Custom hook using `useState` with a `FormBuilderState` object.
- Full undo/redo via an in-memory history stack (`history: FormBuilderState[]` + `historyIndex`).
- Every mutation pushes a `structuredClone` of the new state onto the history stack.
- `canUndo`/`canRedo` are memoized via `useMemo`.
- All mutation functions are plain closures (not `useCallback`) that read `state` directly from the closure.

---

## 4. Component Responsibilities

### Renderer Components

| Component | File | Responsibility |
|---|---|---|
| `SchemaEngine` | `src/engine/SchemaEngine.ts` | Loads JSON, normalizes between schema formats, validates with Zod, provides typed accessors |
| `FormEngine` (hook) | `src/engine/FormEngine.ts` | Wraps `react-hook-form`, builds default values, provides field path helpers, checks tolerance |
| `HeaderForm` | `src/components/HeaderForm.tsx` | Renders corporate header fields (company, title) from schema |
| `MetadataForm` | `src/components/MetadataForm.tsx` | Renders metadata fields (date, inspector, shift) from schema |
| `MatrixTable` | `src/components/MatrixTable.tsx` | Dual-mode table renderer: detects flat vs grouped headers, renders with TanStack Table |
| `DynamicCell` | `src/components/DynamicCell.tsx` | Renders individual cells: display, number-input, text-input, checkbox, textarea, select |
| `GlobalFields` | `src/components/GlobalFields.tsx` | Renders global observations textarea at bottom of report |

### Builder Components

| Component | File | Responsibility |
|---|---|---|
| `FormBuilderApp` | `src/builder/FormBuilderApp.tsx` | Main orchestrator: toolbar, live canvas, modals wiring |
| `useBuilderState` (hook) | `src/builder/components/useBuilderState.ts` | Mutable state with undo/redo, all CRUD operations |
| `ColumnConfigModal` | `src/builder/components/ConfigModals.tsx` | Unified modal for editing columns and groups |
| `SectionConfigModal` | `src/builder/components/ConfigModals.tsx` | Create/edit section title |
| `HeaderConfigModal` | `src/builder/components/ConfigModals.tsx` | Edit document title, company, metadata fields |
| `RowConfigModal` | `src/builder/components/ConfigModals.tsx` | Edit row cell values, delete row |
| `ConfirmDeleteModal` | `src/builder/components/ConfigModals.tsx` | Confirmation dialog before destructive actions |
| `ExportModal` | `src/builder/components/ConfigModals.tsx` | JSON preview, copy, download, import (broken) |
| `Modal` | `src/builder/components/Modal.tsx` | Reusable modal wrapper with overlay, close on Escape |
| `LivePreview` | `src/builder/components/LivePreview.tsx` | Renders builder state using the actual renderer pipeline |
| `buildJsonSchema` | `src/builder/serializer.ts` | Converts builder state → production JSON schema |
| `importFromJsonSchema` | `src/builder/serializer.ts` | Converts JSON schema → builder state (round-trip) |

---

## 5. Unified Column Model (Builder)

The builder uses a single `BuilderColumn` interface that handles both simple columns and grouped headers:

```typescript
interface BuilderColumn {
  id: string;           // Unique identifier
  label: string;        // Display label
  isGroup?: boolean;    // true = group header with children
  key?: string;         // Present for non-group columns (data binding key)
  type?: BuilderColumnType;  // 'text' | 'number' | 'checkbox' | 'textarea' | 'select'
  editable?: boolean;   // Whether operator can edit this field
  options?: string[];   // Options for 'select' type
  children?: BuilderColumn[];  // Sub-columns (only when isGroup === true)
}
```

A `BuilderSection` has a single `columns: BuilderColumn[]` array. The serializer detects if any column has `isGroup === true` and outputs either `columns[]` (flat) or `table.columnGroupHeaders[]` (grouped).

---

## 6. Table Rendering (MatrixTable)

The renderer's `MatrixTable` component uses TanStack Table v8 and has two code paths:

- **Grouped mode** (`hasGroupedHeaders`): Renders a "Parámetro" label column (only if rows have labels) + grouped column headers with `colSpan`/`rowSpan`.
- **Flat mode** (`hasFlatColumns`): Renders columns directly from `section.table.columns[]`.

Both paths use `DynamicCell` for individual cell rendering. The `inferRole()` function maps `cellType` strings to `CellRole` values.

---

## 7. Schema Normalization (SchemaEngine)

`SchemaEngine.normalizeSchema()` handles format differences:

| Input Format | Normalization |
|---|---|
| `document` wrapper | Extracts `company`/`title` → `header`, `metadata` → `metadata` |
| Flat `header`/`metadata` | Passes through |
| `sections[].columns` at section level | Moves to `sections[].table.columns` |
| `sections[].rows` at section level | Moves to `sections[].table.rows` |
| `footer` object | Converts to `footerNotes[]` + `inlineInputs[]` |
| `global_observations` object | Converts to `globalFields[]` array |
| `editable` boolean | Converts to `cellType` string |
| Missing row `id` | Auto-generates from section index |

---

## 8. JSON Serializer (buildJsonSchema)

The serializer in `src/builder/serializer.ts` converts builder state to production JSON:

- **Flat sections**: Outputs `{ columns: [...], rows: [...] }` with `type: 'flat_table'`.
- **Grouped sections**: Outputs `{ table: { columnGroupHeaders: [...], rows: [...] } }` with `type: 'matrix-table'`.
- **Editable cells**: Always initialized to `""` for React Hook Form binding.
- **Read-only cells**: Uses the value from builder state.
- **Column types**: Mapped via `mapCellType()` to `cellType` strings (`number-input`, `text-input`, `checkbox`, `textarea`, `select`, `display`).
- **Footer**: Optional `footer` object with `nota` and `input`.
- **Global observations**: Optional `global_observations` object.