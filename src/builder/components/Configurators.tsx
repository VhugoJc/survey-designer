import type { BuilderEngine } from './useBuilderState';

// ──────────────────────────────────────────────
// Document Configurator
// ──────────────────────────────────────────────

interface DocumentConfiguratorProps {
  engine: BuilderEngine;
}

export function DocumentConfigurator({ engine }: DocumentConfiguratorProps) {
  const state = engine.getState();

  return (
    <div className="paper-header">
      <h3 className="metadata-heading">Documento</h3>
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col">
          <label>Empresa</label>
          <input
            type="text"
            value={state.document.company}
            onChange={(e) => engine.setCompany(e.target.value)}
            className="field-input"
          />
        </div>
        <div className="flex flex-col">
          <label>Título del Reporte</label>
          <input
            type="text"
            value={state.document.title}
            onChange={(e) => engine.setTitle(e.target.value)}
            className="field-input"
          />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Metadata Configurator
// ──────────────────────────────────────────────

interface MetadataConfiguratorProps {
  engine: BuilderEngine;
}

export function MetadataConfigurator({ engine }: MetadataConfiguratorProps) {
  const state = engine.getState();

  return (
    <div className="paper-header">
      <div className="flex items-center justify-between mb-3">
        <h3 className="metadata-heading">Campos de Metadatos</h3>
        <button
          type="button"
          onClick={() => engine.addMetadataField()}
          className="px-3 py-1.5 text-xs font-bold text-white bg-slate-700 rounded-md hover:bg-slate-600"
        >
          + Campo
        </button>
      </div>

      {state.metadata.length === 0 && (
        <p className="text-xs text-slate-400 italic">Sin campos de metadatos.</p>
      )}

      <div className="space-y-2">
        {state.metadata.map((field) => (
          <div
            key={field.key}
            className="grid grid-cols-[1fr_2fr_100px_40px] gap-3 items-center py-1.5 border-b border-slate-100"
          >
            <span className="text-xs text-slate-400 font-mono">{field.key}</span>
            <input
              type="text"
              value={field.label}
              onChange={(e) =>
                engine.updateMetadataField(field.key, { label: e.target.value })
              }
              className="field-input text-xs w-full"
              placeholder="Etiqueta del campo"
            />
            <select
              value={field.type}
              onChange={(e) =>
                engine.updateMetadataField(field.key, {
                  type: e.target.value as 'string' | 'date',
                })
              }
              className="field-input text-xs"
            >
              <option value="string">Texto</option>
              <option value="date">Fecha</option>
            </select>
            <button
              type="button"
              onClick={() => engine.removeMetadataField(field.key)}
              className="text-xs text-red-400 hover:text-red-600"
              title="Eliminar campo"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Global Settings (global observations)
// ──────────────────────────────────────────────

interface GlobalSettingsProps {
  engine: BuilderEngine;
}

export function GlobalSettings({ engine }: GlobalSettingsProps) {
  const state = engine.getState();
  const gf = state.globalField;

  return (
    <div className="paper-header">
      <div className="flex items-center justify-between mb-3">
        <h3 className="metadata-heading">Observaciones Globales</h3>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={gf !== undefined}
            onChange={(e) => {
              if (e.target.checked) {
                engine.setGlobalField({
                  key: 'observaciones_finales',
                  label: 'OBSERVACIONES:',
                  type: 'textarea',
                });
              } else {
                engine.setGlobalField(undefined);
              }
            }}
          />
          Habilitar
        </label>
      </div>

      {gf && (
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_2fr] gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 font-semibold">Clave</label>
              <input
                type="text"
                value={gf.key}
                onChange={(e) => engine.updateGlobalField({ key: e.target.value })}
                className="field-input text-xs"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 font-semibold">Etiqueta</label>
              <input
                type="text"
                value={gf.label}
                onChange={(e) => engine.updateGlobalField({ label: e.target.value })}
                className="field-input text-xs"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 italic">
            Se renderizará como un área de texto al final del reporte.
          </p>
        </div>
      )}
    </div>
  );
}