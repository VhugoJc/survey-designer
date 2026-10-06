import { useForm, FieldValues, DefaultValues } from 'react-hook-form';
import { useMemo, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { SchemaEngine } from './SchemaEngine';

/**
 * Build default form values from ANY schema.
 * Handles both grouped (columnGroupHeaders) and flat (columns) table layouts.
 */
function buildDefaultValues(engine: SchemaEngine): DefaultValues<FieldValues> {
  const schema = engine.getSchema();
  const defaults: Record<string, unknown> = {};

  // Header defaults
  const header = schema.header ?? {};
  for (const [key, def] of Object.entries(header)) {
    defaults[`header.${key}`] = (def as Record<string, unknown>)?.default ?? '';
  }

  // Metadata defaults
  const metadata = schema.metadata ?? {};
  for (const [key] of Object.entries(metadata)) {
    defaults[`metadata.${key}`] = '';
  }

  // Section defaults
  for (const section of schema.sections ?? []) {
    const sectionId = section.id;
    const rows = section.table?.rows ?? [];

    // Detect flat vs grouped
    const flatCols = (section.table?.columns ?? []) as Record<string, unknown>[];
    const hasFlatCols = flatCols.length > 0;

    for (const row of rows) {
      const rowId = row.id;
      const rowType = row.rowType ?? 'measurement';

      // Collect machine keys
      let machineKeys: string[] = [];

      if (hasFlatCols) {
        machineKeys = flatCols.map((c) => c.key as string);
      } else {
        for (const group of section.table?.columnGroupHeaders ?? []) {
          for (const col of group.columns ?? []) {
            if (col.key) machineKeys.push(col.key);
          }
        }
      }

      for (const machineKey of machineKeys) {
        const path = `sections.${sectionId}.rows.${rowId}.cells.${machineKey}`;

        if (rowType === 'checklist') {
          defaults[`${path}.checked`] = false;
        } else {
          defaults[`${path}.value`] = null;

          const condFields = section.conditionalValidation?.requiredFields
            ?? ['observation', 'correction', 'countermeasure'];

          for (const field of condFields) {
            defaults[`${path}.${field}`] = null;
          }
        }
      }
    }

    // Inline inputs defaults
    const inlineInputs = (section as any).inlineInputs as Array<{ key: string }> | undefined;
    if (inlineInputs) {
      for (const ii of inlineInputs) {
        defaults[`sections.${sectionId}.inlineInputs.${ii.key}`] = '';
      }
    }
  }

  // Global fields defaults
  const globalFields = (schema as any).globalFields as Array<{ key: string }> | undefined;
  if (globalFields) {
    for (const gf of globalFields) {
      defaults[`global.${gf.key}`] = '';
    }
  }

  return defaults as DefaultValues<FieldValues>;
}

/**
 * React hook that creates and manages the form engine.
 */
export function useFormEngine(schemaEngine: SchemaEngine) {
  const schema = schemaEngine.getSchema();
  const defaultValues = useMemo(() => buildDefaultValues(schemaEngine), [schemaEngine]);

  const formValuesZodSchema = useMemo(
    () => schemaEngine.buildFormValuesSchema(),
    [schemaEngine],
  );

  const form = useForm<FieldValues>({
    defaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(formValuesZodSchema),
  });

  const getCellValuePath = useCallback(
    (sectionId: string, rowId: string, machineKey: string) =>
      `sections.${sectionId}.rows.${rowId}.cells.${machineKey}.value`,
    [],
  );

  const getConditionalFieldPath = useCallback(
    (sectionId: string, rowId: string, machineKey: string, field: string) =>
      `sections.${sectionId}.rows.${rowId}.cells.${machineKey}.${field}`,
    [],
  );

  const getChecklistPath = useCallback(
    (sectionId: string, rowId: string, machineKey: string) =>
      `sections.${sectionId}.rows.${rowId}.cells.${machineKey}.checked`,
    [],
  );

  const isOutOfTolerance = useCallback(
    (sectionId: string, rowId: string, machineKey: string): boolean => {
      const valuePath = `sections.${sectionId}.rows.${rowId}.cells.${machineKey}.value`;
      const value = form.watch(valuePath) as number | null;

      if (value === null || value === undefined) return false;

      const row = schemaEngine
        .getSection(sectionId)
        ?.table?.rows.find((r) => r.id === rowId);
      if (!row) return false;

      const tolerance = schemaEngine.getTolerance(row, machineKey);
      if (tolerance) {
        return value < tolerance.min || value > tolerance.max;
      }

      const cellDef = row.cells?.[machineKey];
      if (cellDef && typeof cellDef === 'object' && 'min' in cellDef && 'max' in cellDef) {
        const c = cellDef as { min: number; max: number };
        return value < c.min || value > c.max;
      }

      return false;
    },
    [form, schemaEngine],
  );

  return {
    form,
    schemaEngine,
    schema,
    getCellValuePath,
    getConditionalFieldPath,
    getChecklistPath,
    isOutOfTolerance,
    formValuesZodSchema,
  };
}

export type FormEngine = ReturnType<typeof useFormEngine>;