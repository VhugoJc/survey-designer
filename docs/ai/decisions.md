# FEVISA — Technical Decisions

> Decisions inferred from the implementation. These are not hypothetical — they are patterns visible in the code.

---

## 1. Data-Driven Forms Architecture

**Decision:** Forms are defined declaratively in JSON and interpreted dynamically by a rendering engine. There is no hardcoded form layout.

**Evidence:** The entire renderer pipeline (`SchemaEngine` → `useFormEngine` → `MatrixTable` → `DynamicCell`) reads from a JSON schema at runtime. The schema defines columns, rows, cell types, and validation rules. The same renderer handles pressure reports, lubrication logs, and machine checklists without code changes.

**Implication:** Adding a new report type requires only a new JSON schema file, not new React components.

---

## 2. Flexible Zod Validation with `.passthrough()`

**Decision:** Zod schemas use `.passthrough()` at every level to accept unknown properties without throwing errors.

**Evidence:** `src/schema/validation.ts` — every Zod object schema uses `.passthrough()`. The `SchemaEngine` uses `safeParse()` (never `parse()`) and falls back to the raw object on validation failure.

**Rationale:** Different report layouts (pressure, lubrication, checklists) have different JSON structures. Strict validation would reject valid schemas with unexpected properties.

---

## 3. Schema Normalization at Load Time

**Decision:** All schema format differences are resolved in `SchemaEngine.normalizeSchema()` so the rest of the code works with a consistent internal structure.

**Evidence:** `src/engine/SchemaEngine.ts` lines 10-100. The normalizer handles `document` vs `header` wrappers, `columns` at section vs table level, `editable` boolean → `cellType` conversion, and auto-generates missing row IDs.

**Rationale:** Keeps the renderer simple — it only needs to understand one internal format.

---

## 4. React Hook Form for High-Density Forms

**Decision:** `react-hook-form` (v7) is used instead of React's built-in form handling or alternatives like Formik/React Final Form.

**Evidence:** `package.json` dependency `react-hook-form: ^7.89.0`. Used in `FormEngine.ts` with `mode: 'onChange'` and `zodResolver`.

**Rationale:** Industrial inspection forms can have hundreds of fields (10 rows × 10 machines × 4 fields = 400+ fields). `react-hook-form` is designed for high-density form performance.

---

## 5. TanStack Table v8 for Complex Table Rendering

**Decision:** `@tanstack/react-table` v8 is used for rendering matrix tables with grouped headers.

**Evidence:** `package.json` dependency `@tanstack/react-table: ^8.21.3`. Used in `MatrixTable.tsx` with `useReactTable`, `createColumnHelper`, `flexRender`.

**Limitation:** TanStack Table v8 does not natively support `rowSpan` in table body rows. The current implementation only uses `colSpan`/`rowSpan` in the `<thead>`.

---

## 6. Unified Column Model (Builder)

**Decision:** The builder uses a single `BuilderColumn` interface with an `isGroup` flag instead of separate types for flat columns and grouped headers.

**Evidence:** `src/builder/types.ts` — `BuilderColumn` has `isGroup?: boolean` and `children?: BuilderColumn[]`. The `BuilderSection` has a single `columns: BuilderColumn[]` array. The serializer detects groups and outputs the appropriate format.

**Rationale:** This was a refactoring from an earlier design that had separate `BuilderColumn` and `BuilderColumnGroup` types with a `SectionLayout` discriminator. The unified model simplifies the code and allows mixing single columns and groups in the same table.

---

## 7. In-Memory Undo/Redo via History Stack

**Decision:** Builder undo/redo is implemented as an in-memory stack of `structuredClone` snapshots.

**Evidence:** `src/builder/components/useBuilderState.ts` — `history: FormBuilderState[]` array, `historyIndex`, `pushHistory()` on every mutation, `undo()`/`redo()` restore from the stack.

**Limitation:** The entire state is cloned on every mutation. For large schemas with many rows, this could become memory-intensive. History is lost on page refresh.

---

## 8. Plain Functions Instead of `useCallback`

**Decision:** Builder mutation functions are plain closures, not `useCallback`.

**Evidence:** `src/builder/components/useBuilderState.ts` — all functions are defined as `function name()` inside the hook, not as `useCallback(() => ..., [state])`.

**Rationale:** `useCallback` with `[state]` captures the state reference at creation time, causing stale state bugs. Plain closures read `state` directly from the enclosing scope at call time.

---

## 9. Two Schema Formats with Normalization

**Decision:** The app supports two JSON schema formats (`document` wrapper and flat `header`/`metadata`) and normalizes both at load time.

**Evidence:** `src/engine/SchemaEngine.ts` — `normalizeSchema()` detects the format by checking for `obj.document` vs `obj.header`.

**Rationale:** The `document` wrapper format is the builder's native output. The flat format exists for backward compatibility with manually written schemas.

---

## 10. Cell Type Mapping

**Decision:** Column types in the builder (`text`, `number`, `checkbox`, `textarea`, `select`) are mapped to `cellType` strings in the JSON schema (`text-input`, `number-input`, `checkbox`, `textarea`, `select`, `display`).

**Evidence:** `src/builder/serializer.ts` — `mapCellType()` function. `src/components/MatrixTable.tsx` — `inferRole()` function.

**Rationale:** Separates the builder's editing model from the renderer's rendering model. The builder works with abstract types; the renderer works with concrete rendering roles.

---

## 11. No Backend — Static File Loading

**Decision:** Schemas are loaded via static JSON imports, not fetched from an API.

**Evidence:** `src/App.tsx` — `import schemaJson from './schema/lubrication-schema.json'`. The `vite-env.d.ts` declares `declare module '*.json'` to enable JSON imports.

**Implication:** Changing the active schema requires editing `App.tsx` and restarting the dev server. There is no runtime schema switching.

---

## 12. Print Styles with `@media print`

**Decision:** Print styles are defined in `index.css` with `@media print` rules for A4 paper output.

**Evidence:** `src/index.css` — `@page { size: A4 portrait; margin: 15mm 18mm; }`, `print-color-adjust: exact` for dark table headers, `page-break-inside: avoid` on rows.

**Limitation:** The print button in `App.tsx` is currently commented out.

---

## 13. Temporary/Prototype Implementations

The following are clearly temporary or prototype-quality:

| Item | Location | Issue |
|---|---|---|
| `prompt()` for global observations | `FormBuilderApp.tsx` | Uses browser `prompt()` instead of a modal |
| `prompt()` for group rename | `FormBuilderApp.tsx` (removed in latest version) | Same issue |
| Non-functional import | `ConfigModals.tsx` — `ExportModal` | Calls `window.location.reload()` instead of actually importing |
| Commented-out print button | `App.tsx` | Print CSS styles exist but the button was removed from the UI |
| `rows.some()` in MatrixTable | `src/components/MatrixTable.tsx` | `some()` is not a JavaScript array method — would throw at runtime |
| `sec.columns.some()` in useBuilderState | `src/builder/components/useBuilderState.ts` | Same issue — `some()` does not exist |
| `colSpan={99}` for empty rows | `FormBuilderApp.tsx` | Hardcoded large value instead of computed column count |