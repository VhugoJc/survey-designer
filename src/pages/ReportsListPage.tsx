// ──────────────────────────────────────────────
// ReportsListPage — Gallery of available report templates
// ──────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTemplateList, removeTemplate } from '../schema/registry';

export default function ReportsListPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState(getTemplateList());

  const handleRemove = (id: string) => {
    removeTemplate(id);
    setTemplates(getTemplateList());
  };

  return (
    <div className="fluid-canvas">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Reportes / Galería</h1>
          <p className="text-sm text-slate-500 mt-1">
            Seleccione una plantilla de reporte para comenzar a llenar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/reports/new')}
          className="px-5 py-2.5 text-sm font-bold text-white bg-green-700 rounded-lg hover:bg-green-600 transition-colors"
        >
          + Nuevo Reporte
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-base font-bold text-slate-800">{tpl.title}</h2>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  v{tpl.version}
                </span>
              </div>
              {tpl.description && (
                <p className="text-xs text-slate-500 mb-3">{tpl.description}</p>
              )}
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>📅 {tpl.lastModified}</span>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => navigate(`/reports/${tpl.id}`)}
                className="flex-1 py-2 text-sm font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              >
                📋 Llenar Reporte
              </button>
              <button
                type="button"
                onClick={() => handleRemove(tpl.id)}
                className="py-2 px-3 text-sm font-semibold text-red-500 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                title="Eliminar plantilla"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-base text-slate-400">No hay plantillas disponibles.</p>
        </div>
      )}
    </div>
  );
}