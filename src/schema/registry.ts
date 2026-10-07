// ──────────────────────────────────────────────
// Schema Registry — maps template IDs to schemas
// All templates are user-created at runtime.
// ──────────────────────────────────────────────

export interface TemplateInfo {
  id: string;
  title: string;
  description: string;
  version: string;
  lastModified: string;
  schema: Record<string, unknown>;
}

// User-created templates (in-memory, added at runtime)
let userTemplates: TemplateInfo[] = [];

function getAllTemplates(): TemplateInfo[] {
  return userTemplates;
}

export function getTemplateList(): Omit<TemplateInfo, 'schema'>[] {
  return getAllTemplates().map(({ schema: _schema, ...rest }) => rest);
}

export function getTemplateById(id: string): TemplateInfo | undefined {
  return getAllTemplates().find((t) => t.id === id);
}

export function getSchemaById(id: string): Record<string, unknown> | undefined {
  return getAllTemplates().find((t) => t.id === id)?.schema;
}

let _templateCounter = 0;

/**
 * Register a new user-created template in the in-memory registry.
 * Returns the generated template ID.
 */
export function registerTemplate(
  schema: Record<string, unknown>,
  title?: string,
): string {
  _templateCounter++;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const id = `user_${_templateCounter}_${Date.now()}`;

  const info: TemplateInfo = {
    id,
    title: title ?? `Plantilla Personalizada ${_templateCounter}`,
    description: 'Creada desde el diseñador de formularios',
    version: '1.0',
    lastModified: dateStr,
    schema,
  };

  userTemplates = [...userTemplates, info];
  return id;
}

/**
 * Update an existing template's schema and title.
 */
export function updateTemplate(
  id: string,
  schema: Record<string, unknown>,
  title?: string,
): boolean {
  const idx = userTemplates.map((t) => t.id).indexOf(id);
  if (idx < 0) return false;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  userTemplates[idx] = {
    ...userTemplates[idx],
    title: title ?? userTemplates[idx].title,
    lastModified: dateStr,
    schema,
  };
  return true;
}

/**
 * Remove a template by ID.
 */
export function removeTemplate(id: string): boolean {
  const before = userTemplates.length;
  userTemplates = userTemplates.filter((t) => t.id !== id);
  return userTemplates.length < before;
}