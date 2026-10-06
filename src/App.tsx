import { useMemo } from 'react';
import { FormProvider } from 'react-hook-form';
import { SchemaEngine, useFormEngine } from './engine';
import { HeaderForm } from './components/HeaderForm';
import { MetadataForm } from './components/MetadataForm';
import { MatrixTable } from './components/MatrixTable';
import { GlobalFields } from './components/GlobalFields';
import schemaJson from './schema/lubrication-schema.json';

export default function App() {
  const schemaEngine = useMemo(() => new SchemaEngine(schemaJson), []);
  const engine = useFormEngine(schemaEngine);
  const schema = engine.schema as Record<string, unknown>;
  const globalFields = schema.globalFields as
    | Array<{ key: string; label: string; type?: string }>
    | undefined;

  return (
    <FormProvider {...engine.form}>
      {/* Print button — hidden on print */}
      <div className="no-print flex justify-center mb-6">
        {/* <button
          type="button"
          className="print-button"
          onClick={() => window.print()}
        >
          🖨️ Imprimir Reporte
        </button> */}
      </div>

      {/* Fluid centered canvas */}
      <div className="fluid-canvas">
        {/* Corporate Header */}
        <HeaderForm engine={engine} />

        {/* Metadata */}
        <MetadataForm engine={engine} />

        {/* Sections — Matrix Tables */}
        {(engine.schema.sections ?? []).map((section) => (
          <div key={section.id} className="report-card">
            {section.title && <h2 className="section-title">{section.title}</h2>}
            <MatrixTable section={section} engine={engine} />
          </div>
        ))}

        {/* Global Fields (bottom of report) */}
        {globalFields && globalFields.length > 0 && (
          <GlobalFields fields={globalFields} />
        )}

        {/* Report Footer */}
        <div className="report-footer">
          <p>FEVISA — Industrial Inspection Report System v1.0</p>
        </div>
      </div>
    </FormProvider>
  );
}