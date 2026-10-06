import { useFormContext } from 'react-hook-form';
import type { FormEngine } from '../engine/FormEngine';

interface MetadataFormProps {
  engine: FormEngine;
}

export function MetadataForm({ engine }: MetadataFormProps) {
  const { register } = useFormContext();
  const fields = engine.schemaEngine.getMetadataFields();

  return (
    <div className="paper-header">
      <h3 className="metadata-heading">Report Information</h3>
      <div className="grid grid-cols-3 gap-6">
        {fields.map((field: Record<string, unknown>) => (
          <div key={field.key as string} className="flex flex-col">
            <label>{field.label as string}</label>
            {field.enum ? (
              <select
                {...register(`metadata.${field.key}`)}
                className="field-input"
              >
                <option value="">-- Select --</option>
                {(field.enum as string[]).map((opt: string) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...register(`metadata.${field.key}`)}
                type={(field.format as string) === 'date' ? 'date' : 'text'}
                className="field-input"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}