import { useState, useMemo } from 'react';
import { FormProvider } from 'react-hook-form';
import { SchemaEngine, useFormEngine } from './engine';
import { HeaderForm } from './components/HeaderForm';
import { MetadataForm } from './components/MetadataForm';
import { MatrixTable } from './components/MatrixTable';
import { GlobalFields } from './components/GlobalFields';
import { FormBuilderApp } from './builder';
import schemaJson from './schema/lubrication-schema.json';

export default function App() {
  const [mode, setMode] = useState<'render' | 'design'>('render');

  const schemaEngine = useMemo(() => new SchemaEngine(schemaJson), []);
  const engine = useFormEngine(schemaEngine);
  const schema = engine.schema as Record<string, unknown>;
  const globalFields = schema.globalFields as
    | Array<{ key: string; label: string; type?: string }>
    | undefined;

  return (
    <>
      {/* Mode switcher — hidden on print */}
      <div className="no-print flex justify-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => setMode('render')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
            mode === 'render'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
          }`}
        >
          📋 Ver Reporte
        </button>
        <button
          type="button"
          onClick={() => setMode('design')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
            mode === 'design'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
          }`}
        >
          🛠️ Diseñador de Formularios
        </button>
      </div>

      {mode === 'render' ? (
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
              <p>FEVISA — Industrial Inspection Report System v1.0</p>
            </div>
          </div>
        </FormProvider>
      ) : (
        <FormBuilderApp />
      )}
    </>
  );
}