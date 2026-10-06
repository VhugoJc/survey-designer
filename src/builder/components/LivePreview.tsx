import { useMemo } from 'react';
import { FormProvider } from 'react-hook-form';
import { SchemaEngine, useFormEngine } from '../../engine';
import { HeaderForm } from '../../components/HeaderForm';
import { MetadataForm } from '../../components/MetadataForm';
import { MatrixTable } from '../../components/MatrixTable';
import { GlobalFields } from '../../components/GlobalFields';
import type { TableSection } from '../../schema/types';

/**
 * LivePreview — renders a JSON schema using the EXISTING form renderer
 * so the builder user sees exactly what operators will see.
 *
 * Each preview gets its own FormProvider scope so it's isolated
 * from the builder's form state.
 */
interface LivePreviewProps {
  /** The JSON schema to render (output of buildJsonSchema) */
  schemaJson: Record<string, unknown>;
}

export function LivePreview({ schemaJson }: LivePreviewProps) {
  const schemaEngine = useMemo(() => new SchemaEngine(schemaJson), [schemaJson]);
  const engine = useFormEngine(schemaEngine);
  const schema = engine.schema as Record<string, unknown>;
  const globalFields = schema.globalFields as
    | Array<{ key: string; label: string; type?: string }>
    | undefined;

  return (
    <FormProvider {...engine.form}>
      <div className="fluid-canvas">
        <HeaderForm engine={engine} />
        <MetadataForm engine={engine} />

        {(engine.schema.sections ?? []).map((section) => (
          <div key={section.id} className="report-card">
            {section.title && <h2 className="section-title">{section.title}</h2>}
            <MatrixTable section={section} engine={engine} />
          </div>
        ))}

        {globalFields && globalFields.length > 0 && (
          <GlobalFields fields={globalFields} />
        )}

        <div className="report-footer">
          <p>FEVISA — Vista previa en vivo</p>
        </div>
      </div>
    </FormProvider>
  );
}