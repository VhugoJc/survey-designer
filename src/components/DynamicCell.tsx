import { useFormContext } from 'react-hook-form';
import type { FormEngine } from '../engine/FormEngine';

export type CellRole = 'display' | 'number-input' | 'text-input' | 'textarea' | 'checkbox';

interface DynamicCellProps {
  engine: FormEngine;
  sectionId: string;
  rowId: string;
  machineKey: string;
  role: CellRole;
  displayValue?: string;
  min?: number;
  max?: number;
  inputWidth?: 'normal' | 'wide';
}

export function DynamicCell({
  engine,
  sectionId,
  rowId,
  machineKey,
  role,
  displayValue,
  min,
  max,
  inputWidth = 'normal',
}: DynamicCellProps) {
  const { register, watch } = useFormContext();
  const valuePath = `sections.${sectionId}.rows.${rowId}.cells.${machineKey}.value`;

  // ── DISPLAY (read-only text from row data) ──
  if (role === 'display') {
    return (
      <span className="cell-static">
        {displayValue ?? '—'}
      </span>
    );
  }

  // ── CHECKBOX ──
  if (role === 'checkbox') {
    const checkedPath = `sections.${sectionId}.rows.${rowId}.cells.${machineKey}.checked`;
    return (
      <div className="flex justify-center items-center h-full min-h-[44px]">
        <input
          {...register(checkedPath)}
          type="checkbox"
        />
      </div>
    );
  }

  // ── TEXTAREA (for global fields) ──
  if (role === 'textarea') {
    return (
      <textarea
        {...register(valuePath)}
        rows={3}
        placeholder="—"
        className="field-input"
      />
    );
  }

  // ── TEXT INPUT ──
  if (role === 'text-input') {
    const wide = inputWidth === 'wide' ? 'field-input-wide' : '';
    return (
      <input
        {...register(valuePath)}
        type="text"
        placeholder="—"
        className={`field-input ${wide}`}
      />
    );
  }

  // ── NUMBER INPUT (measurement readings) ──
  const value = watch(valuePath) as number | null;
  const isOutOfRange =
    min !== undefined &&
    max !== undefined &&
    value !== null &&
    value !== undefined &&
    (value < min || value > max);

  return (
    <div className="flex flex-col items-center gap-1">
      {min !== undefined && max !== undefined && (
        <span className="tolerance-badge">{min}–{max}</span>
      )}
      <input
        {...register(valuePath, { valueAsNumber: true })}
        type="number"
        step="any"
        inputMode="decimal"
        placeholder="—"
        className={`field-input ${isOutOfRange ? 'out-of-range' : value !== null && value !== undefined ? 'in-range' : ''}`}
      />
      {isOutOfRange && (
        <span className="text-[10px] text-red-600 font-bold uppercase leading-tight mt-0.5">
          ⚠ Fuera de rango
        </span>
      )}
    </div>
  );
}