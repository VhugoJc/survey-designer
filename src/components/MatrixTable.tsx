import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import type { FormEngine } from '../engine/FormEngine';
import type { TableSection, TableRowDef } from '../schema/types';
import { DynamicCell, CellRole } from './DynamicCell';

// ──────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────

function resolveFieldRef(rowDef: Record<string, unknown>, fieldRef: string): string | undefined {
  const parts = fieldRef.split('.');
  let current: unknown = rowDef;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current != null ? String(current) : undefined;
}

function getRows(section: TableSection): TableRowDef[] {
  return (section as any).table?.rows ?? [];
}

function getColumns(section: TableSection): Record<string, unknown>[] {
  return (section as any).table?.columns ?? [];
}

function hasGroupedHeaders(section: TableSection): boolean {
  const groups = (section as any).table?.columnGroupHeaders;
  return groups !== undefined && groups !== null && groups.length > 0;
}

function hasFlatColumns(section: TableSection): boolean {
  const cols = (section as any).table?.columns;
  return cols !== undefined && cols !== null && cols.length > 0;
}

// ──────────────────────────────────────────────
// Row data shapes
// ──────────────────────────────────────────────

interface GroupedRowData {
  rowId: string;
  label: string;
  unit?: string;
  rowType: string;
  rowDef: TableRowDef;
}

interface FlatRowData {
  rowId: string;
  raw: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// GROUPED mode — column builder
// ──────────────────────────────────────────────

function buildGroupedColumns(
  section: TableSection,
  engine: FormEngine,
): ColumnDef<GroupedRowData>[] {
  const ch = createColumnHelper<GroupedRowData>();
  const columns: ColumnDef<GroupedRowData>[] = [];

  // Only add the row-label column if rows actually have labels
  const rows = section.table?.rows ?? [];
  const hasLabels = rows.some((r) => r.label && r.label.trim().length > 0);

  if (hasLabels) {
    columns.push(
      ch.display({
        id: 'row-label',
        header: () => <span>Parámetro</span>,
        cell: (info) => (
          <div className="flex items-center gap-1 min-w-[220px] text-left">
            <span className="text-sm font-medium text-slate-800">
              {info.row.original.label}
            </span>
            {info.row.original.unit && (
              <span className="text-[11px] text-slate-400 ml-1">
                ({info.row.original.unit})
              </span>
            )}
          </div>
        ),
        enableSorting: false,
      }),
    );
  }

  for (const group of section.table?.columnGroupHeaders ?? []) {
    const groupCols: ColumnDef<GroupedRowData>[] = (group.columns ?? []).map((col) => {
      const key = col.key;
      const cellType = (col as Record<string, unknown>).cellType as string | undefined;
      const fieldRef = (col as Record<string, unknown>).fieldRef as string | undefined;

      return ch.display({
        id: key,
        header: () => <span>{col.label}</span>,
        cell: (info) => {
          const rowDef = info.row.original.rowDef;
          const role = inferRole(cellType, info.row.original.rowType);
          const displayValue = role === 'display' && fieldRef ? resolveFieldRef(rowDef as any, fieldRef) : undefined;
          const tol = rowDef.tolerance;
          const min = tol?.min;
          const max = tol?.max;
          const options = (col as Record<string, unknown>).options as string[] | undefined;

          return (
            <DynamicCell
              engine={engine}
              sectionId={section.id}
              rowId={rowDef.id}
              machineKey={key}
              role={role}
              displayValue={displayValue}
              min={min}
              max={max}
              options={options}
            />
          );
        },
        enableSorting: false,
      });
    });

    columns.push({ header: group.label, columns: groupCols });
  }

  return columns;
}

// ──────────────────────────────────────────────
// FLAT mode — column builder
// ──────────────────────────────────────────────

function buildFlatColumns(
  section: TableSection,
  engine: FormEngine,
): ColumnDef<FlatRowData>[] {
  const ch = createColumnHelper<FlatRowData>();
  const colDefs = getColumns(section);

  return colDefs.map((col) => {
    const key = col.key as string;
    const label = col.label as string;
    const cellType = (col.cellType as string | undefined) ?? 'display';
    const fieldRef = (col.fieldRef as string | undefined) ?? key;
    const inputWidth = (col.inputWidth as string | undefined) ?? 'normal';

    return ch.display({
      id: key,
      header: () => <span>{label}</span>,
      cell: (info) => {
        const raw = info.row.original.raw;
        const role = inferRole(cellType, 'measurement');
        const displayValue = role === 'display' ? resolveFieldRef(raw, fieldRef) : undefined;
        const options = (col as Record<string, unknown>).options as string[] | undefined;

        return (
          <DynamicCell
            engine={engine}
            sectionId={section.id}
            rowId={info.row.original.rowId}
            machineKey={key}
            role={role}
            displayValue={displayValue}
            inputWidth={inputWidth as 'normal' | 'wide'}
            options={options}
          />
        );
      },
      enableSorting: false,
    });
  });
}

// ──────────────────────────────────────────────
// Role inference
// ──────────────────────────────────────────────

function inferRole(cellType: string | undefined, rowType: string): CellRole {
  if (cellType === 'display') return 'display';
  if (cellType === 'text-input') return 'text-input';
  if (cellType === 'textarea') return 'textarea';
  if (cellType === 'checkbox') return 'checkbox';
  if (cellType === 'select') return 'select';
  if (cellType === 'number-input') return 'number-input';
  if (rowType === 'checklist') return 'checkbox';
  return 'number-input';
}

// ──────────────────────────────────────────────
// Inline inputs renderer
// ──────────────────────────────────────────────

function renderInlineInputs(
  section: TableSection,
  engine: FormEngine,
): React.ReactNode {
  const inlineInputs = (section as any).inlineInputs as
    | Array<{ key: string; label: string }>
    | undefined;
  if (!inlineInputs || inlineInputs.length === 0) return null;

  const { register } = useFormContext();

  return (
    <div className="mt-3 space-y-2">
      {inlineInputs.map((ii) => (
        <div key={ii.key} className="inline-input-row">
          <label>{ii.label}</label>
          <input
            {...register(`sections.${section.id}.inlineInputs.${ii.key}`)}
            type="text"
            className="field-input"
          />
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Footer notes renderer
// ──────────────────────────────────────────────

function renderFooterNotes(section: TableSection): React.ReactNode {
  const notes = (section as any).footerNotes as string[] | undefined;
  if (!notes || notes.length === 0) return null;

  return (
    <div className="footer-note">
      {notes.map((n, i) => (
        <p key={i}>• {n}</p>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main MatrixTable component
// ──────────────────────────────────────────────

interface MatrixTableProps {
  section: TableSection;
  engine: FormEngine;
}

export function MatrixTable({ section, engine }: MatrixTableProps) {
  const isGrouped = hasGroupedHeaders(section);
  const isFlat = hasFlatColumns(section);

  const groupedData = useMemo(
    () =>
      (section.table?.rows ?? []).map((row) => ({
        rowId: row.id,
        label: row.label ?? '',
        unit: row.unit,
        rowType: row.rowType ?? 'measurement',
        rowDef: row,
      })),
    [section],
  );
  const groupedColumns = useMemo(
    () => buildGroupedColumns(section, engine),
    [section, engine],
  );

  const flatData = useMemo(
    () =>
      getRows(section).map((r) => ({
        rowId: r.id,
        raw: r as unknown as Record<string, unknown>,
      })),
    [section],
  );
  const flatColumns = useMemo(
    () => buildFlatColumns(section, engine),
    [section, engine],
  );

  if (isGrouped) {
    return renderGroupedTable(section, engine, groupedData, groupedColumns);
  } else if (isFlat) {
    return renderFlatTable(section, engine, flatData, flatColumns);
  } else {
    return (
      <p className="text-sm text-slate-400 italic">No table columns defined.</p>
    );
  }
}

// ── Grouped table ──
function renderGroupedTable(
  section: TableSection,
  engine: FormEngine,
  data: GroupedRowData[],
  columns: ColumnDef<GroupedRowData>[],
) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto min-w-full">
      <table className="paper-table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  colSpan={h.colSpan}
                  rowSpan={h.isPlaceholder ? 2 : 1}
                  className={
                    h.id === 'row-label'
                      ? 'sticky left-0 z-10 min-w-[220px]'
                      : 'sub-header'
                  }
                >
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={
                    cell.column.id === 'row-label'
                      ? 'sticky left-0 z-10 text-left font-medium'
                      : ''
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {renderFooterNotes(section)}
      {renderInlineInputs(section, engine)}
    </div>
  );
}

// ── Flat table ──
function renderFlatTable(
  section: TableSection,
  engine: FormEngine,
  data: FlatRowData[],
  columns: ColumnDef<FlatRowData>[],
) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto min-w-full">
      <table className="paper-table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  colSpan={h.colSpan}
                  rowSpan={h.isPlaceholder ? 2 : 1}
                >
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {renderFooterNotes(section)}
      {renderInlineInputs(section, engine)}
    </div>
  );
}