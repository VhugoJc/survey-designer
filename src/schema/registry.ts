// ──────────────────────────────────────────────
// Schema Registry — maps template IDs to schemas
// ──────────────────────────────────────────────

import pressureSchema from './pressure-verification-schema.json';
import lubricationSchema from './lubrication-schema.json';

export interface TemplateInfo {
  id: string;
  title: string;
  description: string;
  version: string;
  lastModified: string;
  schema: Record<string, unknown>;
}

const templates: TemplateInfo[] = [
  {
    id: 'pressure-verification',
    title: 'Verificación de Presiones',
    description: 'Reporte de verificación de presiones de mecanismos de máquinas',
    version: '1.0',
    lastModified: '2026-09-15',
    schema: pressureSchema as Record<string, unknown>,
  },
  {
    id: 'lubrication',
    title: 'Lubricación y Mantenimiento',
    description: 'Reporte de lubricación y mantenimiento general',
    version: '1.0',
    lastModified: '2026-09-20',
    schema: lubricationSchema as Record<string, unknown>,
  },
];

export function getTemplateList(): Omit<TemplateInfo, 'schema'>[] {
  return templates.map(({ schema: _schema, ...rest }) => rest);
}

export function getTemplateById(id: string): TemplateInfo | undefined {
  return templates.find((t) => t.id === id);
}

export function getSchemaById(id: string): Record<string, unknown> | undefined {
  return templates.find((t) => t.id === id)?.schema;
}