import { useState } from 'react';
import { useBuilderState } from './components/useBuilderState';
import { SectionListEditor } from './components/SectionEditor';
import { DocumentConfigurator, MetadataConfigurator, GlobalSettings } from './components/Configurators';
import { LivePreview } from './components/LivePreview';
import { buildJsonSchema, importFromJsonSchema } from './serializer';
import type { FormBuilderState } from './types';

type BuilderTab = 'design' | 'preview' | 'export';

// ──────────────────────────────────────────────
// FormBuilderApp — main orchestrator
// ──────────────────────────────────────────────

interface FormBuilderAppProps {
  initialJson?: Record<string, unknown>;
}

export function FormBuilderApp({ initialJson }: FormBuilderAppProps) {
  const initial: FormBuilderState | undefined =
    initialJson ? importFromJsonSchema(initialJson) : undefined;

  const engine = useBuilderState(initial);
  const [tab, setTab] = useState<BuilderTab>('design');

  return (
    <div className="fluid-canvas">
      {/* Toolbar */}
      <Toolbar engine={engine} tab={tab} onTabChange={setTab} />

      {/* Tab content */}
      {tab === 'design' && <DesignTab engine={engine} />}
      {tab === 'preview' && <PreviewTab engine={engine} />}
      {tab === 'export' && <ExportTab engine={engine} />}
    </div>
  );
}

// ── Toolbar with tabs ──

function Toolbar({
  engine,
  tab,
  onTabChange,
}: {
  engine: ReturnType<typeof useBuilderState>;
  tab: BuilderTab;
  onTabChange: (t: BuilderTab) => void;
}) {
  const tabs: { id: BuilderTab; label: string; icon: string }[] = [
    { id: 'design', label: 'Diseño', icon: '✏️' },
    { id: 'preview', label: 'Vista Previa', icon: '👁️' },
    { id: 'export', label: 'Exportar', icon: '📦' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
      {/* Tab bar */}
      <div className="flex items-stretch border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Undo/Redo bar (always visible) */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Form Builder
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => engine.undo()}
            disabled={!engine.canUndo}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40"
          >
            ↩ Deshacer
          </button>
          <button
            type="button"
            onClick={() => engine.redo()}
            disabled={!engine.canRedo}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40"
          >
            ↪ Rehacer
          </button>
        </div>
        <span className="text-xs text-slate-400">
          {engine.getState().sections.length} secciones · {engine.getState().metadata.length} metadatos
        </span>
      </div>
    </div>
  );
}

// ── Design Tab ──

function DesignTab({ engine }: { engine: ReturnType<typeof useBuilderState> }) {
  return (
    <>
      <DocumentConfigurator engine={engine} />
      <MetadataConfigurator engine={engine} />
      <div className="report-card">
        <SectionListEditor engine={engine} />
      </div>
      <GlobalSettings engine={engine} />
    </>
  );
}

// ── Preview Tab ──

function PreviewTab({ engine }: { engine: ReturnType<typeof useBuilderState> }) {
  const state = engine.getState();
  const json = buildJsonSchema(state);

  return (
    <div className="report-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          👁️ Vista Previa en Vivo
        </h3>
        <span className="text-xs text-slate-400">
          El formulario se actualiza automáticamente
        </span>
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <LivePreview schemaJson={json} />
      </div>
    </div>
  );
}

// ── Export Tab ──

function ExportTab({ engine }: { engine: ReturnType<typeof useBuilderState> }) {
  const state = engine.getState();
  const json = buildJsonSchema(state);
  const jsonStr = JSON.stringify(json, null, 2);

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = (window as any).URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.document.title || 'form'}.json`.replace(/[^a-z0-9_.-]/gi, '_');
    a.click();
    (window as any).URL.revokeObjectURL(url);
  };

  return (
    <div className="report-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          📦 Exportar JSON
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-bold text-white bg-slate-700 rounded-md hover:bg-slate-600"
          >
            {copied ? '✅ Copiado' : '📋 Copiar'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 text-xs font-bold text-white bg-slate-700 rounded-md hover:bg-slate-600"
          >
            ⬇️ Descargar
          </button>
        </div>
      </div>

      <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-64 overflow-auto text-slate-600 whitespace-pre-wrap break-all">
        {jsonStr}
      </pre>

      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>💡 Integración:</strong> Copia o descarga el JSON y súbelo a la carpeta{' '}
        <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">src/schema/</code>
        de la aplicación. El SchemaEngine lo cargará automáticamente.
      </div>
    </div>
  );
}