# FEVISA Industrial Inspection App — Current State

> **Date:** 2026-10-06
> **Status:** Frontend-only proof of concept. Not production-ready.
> **Repository:** `https://github.com/VhugoJc/survey-designer.git`

---

## 1. Project Purpose

A web application to digitize printed industrial inspection and plant maintenance reports. The project has two modes:

- **Report Renderer** (`mode='render'`): Renders a JSON-defined form with tables, inputs, checkboxes, and conditional validation.
- **Form Builder** (`mode='design'`): A visual designer to create and edit the JSON schemas that the renderer consumes.

Both modes are accessible via a tab switcher at the top of the page. The renderer is the default view.

---

## 2. Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| **React 18** | ^18.3.1 | UI framework |
| **TypeScript** | 5.5 | Language (strict mode) |
| **Vite** | ^5.4.21 | Build tool & dev server |
| **react-hook-form** | ^7.89.0 | Form state management (high-performance, onChange mode) |
| **@hookform/resolvers** | ^5.9.1 | Zod resolver integration for react-hook-form |
| **@tanstack/react-table** | ^8.21.3 | Table rendering with grouped headers |
| **Zod** | ^3.23.8 | Runtime schema validation |
| **Tailwind CSS** | ^3.4.19 | Utility-first CSS framework |
| **PostCSS** | ^8.5.29 | CSS processing pipeline |

### Notable absences
- No backend, database, or API layer.
- No authentication, authorization, or user management.
- No persistence mechanism (schemas are loaded from static JSON imports).
- No testing framework.
- No routing library.

---

## 3. Project Structure

```
demo/
├── index.html                          # Vite entry HTML
├── package.json
├── tsconfig.json                       # TypeScript strict mode, ES2020 target
├── vite.config.ts                      # Vite + React plugin
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.tsx                        # App entry point
    ├── App.tsx                         # Root component (mode switcher)
    ├── index.css                       # All CSS (Tailwind + custom + print)
    ├── vite-env.d.ts                   # JSON module declaration
    ├── schema/
    │   ├── types.ts                    # Renderer-side type definitions (flexible)
    │   ├── validation.ts               # Zod schemas + dynamic form validator
    │   ├── pressure-verification-schema.json  # Example: pressure report
    │   └── lubrication-schema.json     # Currently loaded schema
    ├── engine/
    │   ├── index.ts                    # Barrel export
    │   ├── SchemaEngine.ts             # Loads, normalizes, validates schemas
    │   └── FormEngine.ts               # React Hook Form wrapper + defaults builder
    ├── components/
    │   ├── HeaderForm.tsx              # Renders corporate header fields
    │   ├── MetadataForm.tsx            # Renders metadata fields
    │   ├── MatrixTable.tsx             # Dual-mode table renderer (flat/grouped)
    │   ├── DynamicCell.tsx             # Cell renderer (text/number/checkbox/textarea/select)
    │   └── GlobalFields.tsx            # Renders global observations textarea
    └── builder/
        ├── index.ts                    # Barrel export
        ├── types.ts                    # Builder-side type definitions (unified column model)
        ├── serializer.ts               # Builder state ↔ JSON schema conversion
        ├── FormBuilderApp.tsx          # Main builder orchestrator + live canvas
        └── components/
            ├── index.ts                # Barrel export
            ├── useBuilderState.ts      # State management hook (undo/redo)
            ├── ConfigModals.tsx        # All modal dialogs (header, section, column, row, export)
            ├── Modal.tsx               # Reusable modal dialog wrapper
            └── LivePreview.tsx         # Renders builder state using the actual form renderer
```

---

## 4. Two Schema Formats

The project supports two JSON schema formats, normalized at load time by `SchemaEngine`:

### Format A: `document` wrapper (preferred for builder output)
```json
{
  "document": {
    "company": "FEVISA",
    "title": "Report Title",
    "metadata": { "fieldKey": { "type": "string", "label": "Field Label:" } }
  },
  "sections": [ /* ... */ ],
  "global_observations": { "key": "...", "label": "...", "type": "textarea" }
}
```

### Format B: Flat `header`/`metadata` (legacy/pressure report)
```json
{
  "header": { "companyName": { "type": "string", "label": "Empresa", "default": "FEVISA" } },
  "metadata": { "inspector": { "type": "string", "label": "ENCARGADO INSPECCIÓN:" } },
  "sections": [ /* ... */ ]
}
```

Both formats are normalized into the same internal structure by `SchemaEngine.normalizeSchema()`.

---

## 5. Section Table Layouts

Sections can contain either:

### Flat columns (`columns[]`)
```json
{
  "columns": [
    { "key": "lubricante", "label": "LUBRICANTE", "editable": false, "type": "text" }
  ],
  "rows": [
    { "id": "row_1", "lubricante": "M-68 SHELL HIDRAULIC" }
  ]
}
```

### Grouped column headers (`table.columnGroupHeaders[]`)
```json
{
  "table": {
    "columnGroupHeaders": [
      { "label": "M11", "colspan": 2, "columns": [
        { "key": "m11_std", "label": "ESTÁNDAR", "cellType": "display" },
        { "key": "m11_val", "label": "LECTURA", "cellType": "number-input" }
      ]}
    ],
    "rows": [ /* ... */ ]
  }
}
```

The builder's unified column model (`BuilderColumn.isGroup`) can produce either output format via the serializer.

---

## 6. Current Limitations

1. **No persistence** — Schemas are loaded from static JSON imports. The builder's "Export" tab copies JSON to clipboard or downloads a file, but there is no save-to-server flow.
2. **No backend** — Entirely frontend. No API, database, or user accounts.
3. **No authentication** — No login, roles, or permissions.
4. **No testing** — Zero tests.
5. **Single schema at a time** — The app loads one schema file. There is no schema library or list view.
6. **Builder state is not saved** — Refreshing the page loses all builder changes.
7. **Undo/redo is in-memory only** — History is lost on page refresh.
8. **No rowspan support in table body** — The renderer does not support merged/spanning rows.
9. **No conditional validation in builder** — The builder cannot configure `conditionalValidation` rules.
10. **No tolerance/standards editing in builder** — The builder does not support the pressure report's `tolerance` and `standards` row properties.
11. **No file upload for import** — The "Import JSON" feature in the export modal is non-functional (it calls `window.location.reload()`).
12. **Print button removed** — The print button was removed from `App.tsx`. Print CSS styles still exist in `index.css`.
13. **`prompt()` dialogs** — The global observations label editor and group rename use browser `prompt()` dialogs instead of modals.
14. **`some()` usage** — `MatrixTable.tsx` uses `rows.some()` which does not exist in JavaScript (would cause runtime error if the grouped renderer path is hit with label-less rows).

---

## 7. Known Technical Debt

- `BuilderColumn` uses `id` as the primary identifier, but `key` is optional. Some code paths assume `key` is always present.
- The `SectionConfigModal` still references `layout` and `setSectionLayout` in comments/removed code but the unified model no longer uses them.
- `LivePreview.tsx` imports `TableSection` type from `schema/types.ts` but only uses it in a type assertion.
- The `ExportModal` has a non-functional import feature.
- The `removeColumn` function in `useBuilderState.ts` uses `sec.columns.some()` which does not exist in JavaScript ES2020.