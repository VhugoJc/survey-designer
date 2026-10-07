// ──────────────────────────────────────────────
// ReportFillPage — Renders a form from a template schema
// ──────────────────────────────────────────────

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FormProvider } from 'react-hook-form';
import { SchemaEngine, useFormEngine } from '../engine';
import { HeaderForm } from '../components/HeaderForm';
import { MetadataForm } from '../components/MetadataForm';
import { MatrixTable } from '../components/MatrixTable';
import { GlobalFields } from '../components/GlobalFields';
import { getSchemaById } from '../schema/registry';

export default function ReportFillPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const schemaJson = templateId ? getSchemaById(templateId) : undefined;

  if (!schemaJson) {
    return (
      <div className="fluid-canvas">
        <div className="text-center py-12">
          <h2 className="text-lg font-bold text-slate-700">Plantilla no encontrada</h2>
          <p className="text-sm text-slate-500 mt-2">
            La plantilla "{templateId}" no existe.
          </p>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-slate-700 rounded-lg hover:bg-slate-600"
          >
            ← Volver a Galería
          </button>
        </div>
      </div>
    );
  }

  const schemaEngine = useMemo(() => new SchemaEngine(schemaJson), [schemaJson]);
  const engine = useFormEngine(schemaEngine);
  const schema = engine.schema as Record<string, unknown>;
  const globalFields = schema.globalFields as
    | Array<{ key: string; label: string; type?: string }>
    | undefined;

  return (
    <div className="fluid-canvas">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50">
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-100"
          >
            ← Volver a Galería
          </button>
          <span className="text-xs text-slate-400">
            {templateId}
          </span>
        </div>
      </div>

      {/* Form */}
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
    </div>
  );
}