import { useFormContext } from 'react-hook-form';
import type { FormEngine } from '../engine/FormEngine';

interface HeaderFormProps {
  engine: FormEngine;
}

export function HeaderForm({ engine }: HeaderFormProps) {
  const { register } = useFormContext();
  const fields = engine.schemaEngine.getHeaderFields();

  return (
    <div className="paper-header">
      <div className="grid grid-cols-2 gap-6">
        {fields.map((field: Record<string, unknown>) => {
          if (field.optional) return null;
          return (
            <div key={field.key as string} className="flex flex-col">
              <label>{field.label as string}</label>
              <input
                {...register(`header.${field.key}`)}
                className="field-input"
                placeholder={(field.default as string) ?? ''}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}