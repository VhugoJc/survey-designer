import { useFormContext } from 'react-hook-form';

interface GlobalFieldsProps {
  fields: Array<{ key: string; label?: string; type?: string }>;
}

export function GlobalFields({ fields }: GlobalFieldsProps) {
  const { register } = useFormContext();

  return (
    <div className="global-fields-section">
      {fields.map((gf) => {
        const path = `global.${gf.key}`;
        return (
          <div key={gf.key} className="mb-3">
            <label>{gf.label ?? gf.key}</label>
            {gf.type === 'textarea' ? (
              <textarea
                {...register(path)}
                rows={4}
                className="field-input"
              />
            ) : (
              <input
                {...register(path)}
                type="text"
                className="field-input"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}